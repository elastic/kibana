/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createQuantitativeCorrectnessEvaluators,
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type EvaluationResult,
  type Example,
  type EvaluationDataset,
  createQuantitativeGroundednessEvaluator,
  selectEvaluators,
  withEvaluatorSpan,
  createSpanLatencyEvaluator,
  createSkillInvocationEvaluator,
  createRagEvaluators,
  type GroundTruth,
  type ExperimentTask,
  type TaskOutput,
} from '@kbn/evals';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  extractAllStrings,
  extractMaxSemver,
  extractReleaseDateNearVersion,
  getBooleanMeta,
  getFinalAssistantMessage,
  getStringMeta,
  getToolCallSteps,
} from '@kbn/evals';
import type { AgentBuilderEvaluationChatClient } from './chat_client';
import { extractSearchRetrievedDocs } from './rag_extractor';

interface ToolCallAssertion {
  /** The tool ID expected to have been called. */
  id: string;
  /** If the primary tool was not called, accept any of these tool IDs as satisfying the "tool was used" check (no criteria evaluated for alternatives). */
  acceptableAlternativeToolIds?: string[];
  /** Natural-language assertions about the tool call's arguments, judged by the criteria evaluator. */
  criteria?: string[];
}

interface DatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    expected?: string;
    /** Natural-language assertions that the final answer must satisfy. Judged independently by the criteria evaluator. */
    criteria?: string[];
    /** Tool-call assertions: each declared tool must have been called; optional per-call args criteria. */
    toolCalls?: ToolCallAssertion[];
    groundTruth?: GroundTruth;
  };
  metadata?: {
    [key: string]: unknown;
  };
}

export type EvaluateDataset = ({
  dataset: { name, description, examples },
}: {
  dataset: {
    name: string;
    description: string;
    examples: DatasetExample[];
  };
}) => Promise<void>;

export type EvaluateExternalDataset = (datasetName: string) => Promise<void>;

function getCalledToolIds(output: TaskOutput): string[] {
  const calls = getToolCallSteps(output);
  return [...new Set(calls.map((c) => c.tool_id).filter((id): id is string => Boolean(id)))];
}

async function evaluateToolCallAssertion(
  assertion: ToolCallAssertion,
  evaluators: DefaultEvaluators,
  input: DatasetExample['input'],
  output: TaskOutput,
  metadata: DatasetExample['metadata']
): Promise<EvaluationResult> {
  const allCalls = getToolCallSteps(output);
  const primary = allCalls.filter((c) => c.tool_id === assertion.id);
  const alternatives = assertion.acceptableAlternativeToolIds ?? [];
  const altCalled =
    alternatives.length > 0 && alternatives.some((alt) => allCalls.some((c) => c.tool_id === alt));

  if (primary.length === 0 && !altCalled) {
    const called = getCalledToolIds(output);
    const summary = called.length > 0 ? ` Called: [${called.join(', ')}]` : ' No tools called.';
    return {
      score: 0,
      label: 'FAIL',
      explanation: `Tool "${assertion.id}" was not called.${summary}`,
    };
  }

  if (altCalled && primary.length === 0) {
    return {
      score: 1,
      label: 'PASS',
      explanation: `Primary tool "${assertion.id}" not called; an acceptable alternative was.`,
    };
  }

  if (!assertion.criteria || assertion.criteria.length === 0) {
    return {
      score: 1,
      label: 'PASS',
      explanation: `Tool "${assertion.id}" was called.`,
    };
  }

  const criteriaResult = await evaluators
    .criteria(assertion.criteria)
    .evaluate({ input, expected: { criteria: assertion.criteria }, output, metadata });

  return {
    score: criteriaResult.score ?? null,
    label: criteriaResult.label ?? 'PASS',
    explanation: `Tool "${assertion.id}" was called. ${criteriaResult.explanation ?? ''}`,
  };
}

function combineToolCallResults(results: EvaluationResult[]): EvaluationResult {
  const allPassed = results.every((r) => r.label === 'PASS' && (r.score ?? 0) > 0);
  const numericScores = results.map((r) => r.score ?? 0);
  const avg =
    numericScores.length > 0 ? numericScores.reduce((a, b) => a + b, 0) / numericScores.length : 0;
  return {
    score: allPassed ? avg : 0,
    label: allPassed ? 'PASS' : 'FAIL',
    explanation: results.map((r) => r.explanation ?? '').join(' | '),
  };
}

function configureExperiment({
  evaluators,
  chatClient,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  chatClient: AgentBuilderEvaluationChatClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}): {
  task: ExperimentTask<DatasetExample, TaskOutput>;
  evaluators: ReturnType<typeof selectEvaluators>;
} {
  const task: ExperimentTask<DatasetExample, TaskOutput> = async ({ input, output, metadata }) => {
    const agentId = getStringMeta(metadata, 'agentId');
    const response = await chatClient.converse({
      messages: [{ message: input.question }],
      options: agentId ? { agentId } : undefined,
    });

    // Running correctness and groundedness evaluators as part of the task since their respective quantitative evaluators need their output
    // Wrap LLM judge calls @kbn/evals spans and assign root context to prevent them from contributing to latency, token use and other metrics of the EvaluateExample span
    const [correctnessResult, groundednessResult] = await Promise.all([
      withEvaluatorSpan('CorrectnessAnalysis', {}, () =>
        evaluators.correctnessAnalysis().evaluate({
          input,
          expected: output,
          output: response,
          metadata,
        })
      ),
      withEvaluatorSpan('GroundednessAnalysis', {}, () =>
        evaluators.groundednessAnalysis().evaluate({
          input,
          expected: output,
          output: response,
          metadata,
        })
      ),
    ]);

    return {
      errors: response.errors,
      messages: response.messages,
      steps: response.steps,
      traceId: response.traceId,
      correctnessAnalysis: correctnessResult?.metadata,
      groundednessAnalysis: groundednessResult?.metadata,
    };
  };

  const ragEvaluators = createRagEvaluators({
    k: 10,
    relevanceThreshold: 1,
    extractRetrievedDocs: extractSearchRetrievedDocs,
    extractGroundTruth: (referenceOutput: DatasetExample['output']) =>
      referenceOutput?.groundTruth ?? {},
  });

  const selectedEvaluators = selectEvaluators([
    {
      name: 'Criteria',
      kind: 'LLM' as const,
      evaluate: async ({ input, output, expected, metadata }) => {
        const criteria = (expected as DatasetExample['output'])?.criteria ?? [];
        if (criteria.length === 0) {
          return { score: null, label: 'N/A', explanation: 'No criteria specified.' };
        }
        return evaluators.criteria(criteria).evaluate({
          input,
          expected: { criteria },
          output,
          metadata,
        });
      },
    },
    {
      name: 'ToolCalls',
      kind: 'LLM' as const,
      evaluate: async ({ input, output, expected, metadata }) => {
        const toolCalls = (expected as DatasetExample['output'])?.toolCalls ?? [];
        if (toolCalls.length === 0) {
          return { score: null, label: 'N/A', explanation: 'No tool call assertions specified.' };
        }
        const results: EvaluationResult[] = [];
        for (const assertion of toolCalls) {
          results.push(
            await evaluateToolCallAssertion(
              assertion,
              evaluators,
              input as DatasetExample['input'],
              output as TaskOutput,
              (metadata ?? undefined) as DatasetExample['metadata']
            )
          );
        }
        return combineToolCallResults(results);
      },
    },
    {
      name: 'ToolUsageOnly',
      kind: 'CODE' as const,
      evaluate: async ({ output, metadata }) => {
        const expectedOnlyToolId = getStringMeta(metadata, 'expectedOnlyToolId');
        if (!expectedOnlyToolId) return { score: 1 };

        const toolCalls = getToolCallSteps(output as TaskOutput);
        if (toolCalls.length === 0) {
          return { score: 0, metadata: { reason: 'No tool calls found', expectedOnlyToolId } };
        }

        const usedToolIds = toolCalls.map((t) => t.tool_id).filter(Boolean);
        const hasExpected = usedToolIds.includes(expectedOnlyToolId);
        const allExpected = usedToolIds.every((id) => id === expectedOnlyToolId);

        return {
          score: hasExpected && allExpected ? 1 : 0,
          metadata: { expectedOnlyToolId, usedToolIds },
        };
      },
    },
    {
      name: 'DocVersionReleaseDate',
      kind: 'CODE' as const,
      evaluate: async ({ output, metadata }) => {
        if (!getBooleanMeta(metadata, 'requireVersionAndReleaseDate')) return { score: 1 };

        const expectedOnlyToolId = getStringMeta(metadata, 'expectedOnlyToolId');
        const toolCalls = getToolCallSteps(output as TaskOutput);
        const matching = expectedOnlyToolId
          ? toolCalls.filter((t) => t.tool_id === expectedOnlyToolId)
          : toolCalls;

        const strings: string[] = [];
        for (const call of matching) {
          extractAllStrings(call.results, strings);
        }
        const toolText = strings.join('\n');

        const maxVersion = extractMaxSemver(toolText);
        const releaseDate = maxVersion
          ? extractReleaseDateNearVersion(toolText, maxVersion)
          : undefined;
        const answer = getFinalAssistantMessage(output as TaskOutput);

        const hasVersion = Boolean(maxVersion) && answer.includes(maxVersion!);
        const hasDate = Boolean(releaseDate) && answer.includes(releaseDate!);

        return {
          score: hasVersion && hasDate ? 1 : 0,
          metadata: {
            extracted: { maxVersion, releaseDate },
            answerPreview: answer.slice(0, 500),
          },
        };
      },
    },
    ...createQuantitativeCorrectnessEvaluators(),
    createQuantitativeGroundednessEvaluator(),
    ...ragEvaluators,
    ...Object.values({
      ...evaluators.traceBasedEvaluators,
      latency: createSpanLatencyEvaluator({
        traceEsClient,
        log,
        spanName: 'Converse',
      }),
    }),
    createSkillInvocationEvaluator({
      traceEsClient,
      log,
      skillName: 'data-exploration',
    }),
    {
      name: 'ExpectedSkillInvocation',
      kind: 'CODE' as const,
      evaluate: async ({ output, metadata }) => {
        const expectedSkill = getStringMeta(metadata, 'expectedSkill');
        const shouldNotActivate = getStringMeta(metadata, 'shouldNotActivateSkill');
        const skillName = expectedSkill ?? shouldNotActivate;

        if (!skillName) return { score: 1 };
        if (!/^[a-zA-Z0-9_-]+$/.test(skillName)) {
          return { score: null, label: 'error', explanation: `Invalid skill name: ${skillName}` };
        }

        const traceId = (output as Record<string, unknown>)?.traceId as string | undefined;
        if (!traceId) {
          return {
            score: null,
            label: 'unavailable',
            explanation: 'No traceId available for skill invocation check',
          };
        }

        const query = `FROM traces-*
| WHERE trace.id == "${traceId}"
| STATS skill_invoked = COUNT(
    CASE(
      attributes.gen_ai.tool.name == "filestore.read"
        AND attributes.elastic.tool.parameters LIKE "*/${skillName}/SKILL.md*",
      1,
      NULL
    )
  )`;

        try {
          const response = (await traceEsClient.esql.query({ query })) as unknown as {
            values: number[][];
          };
          const invoked = (response.values?.[0]?.[0] ?? 0) > 0;

          if (expectedSkill) {
            return {
              score: invoked ? 1 : 0,
              metadata: { expectedSkill, invoked },
            };
          }
          return {
            score: invoked ? 0 : 1,
            metadata: { shouldNotActivateSkill: shouldNotActivate, invoked },
          };
        } catch (error) {
          log.warning(
            `ExpectedSkillInvocation failed for trace ${traceId}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          return { score: null, label: 'error' };
        }
      },
    },
  ]);

  return { task, evaluators: selectedEvaluators };
}

export function createEvaluateDataset({
  evaluators,
  executorClient,
  chatClient,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  chatClient: AgentBuilderEvaluationChatClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}): EvaluateDataset {
  return async function evaluateDataset({
    dataset: { name, description, examples },
  }: {
    dataset: {
      name: string;
      description: string;
      examples: DatasetExample[];
    };
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset;

    const { task, evaluators: selectedEvaluators } = configureExperiment({
      evaluators,
      chatClient,
      traceEsClient,
      log,
    });

    await executorClient.runExperiment(
      {
        dataset,
        task,
      },
      selectedEvaluators
    );
  };
}

export function createEvaluateExternalDataset({
  evaluators,
  executorClient,
  chatClient,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  chatClient: AgentBuilderEvaluationChatClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}): EvaluateExternalDataset {
  return async function evaluateExternalDataset(datasetName: string) {
    const resolvesFromPhoenix = process.env.KBN_EVALS_EXECUTOR === 'phoenix';
    const { task, evaluators: selectedEvaluators } = configureExperiment({
      evaluators,
      chatClient,
      traceEsClient,
      log,
    });

    await executorClient.runExperiment(
      {
        dataset: {
          name: datasetName,
          description: resolvesFromPhoenix
            ? 'External dataset resolved from Phoenix by name'
            : 'External dataset resolved from Elasticsearch by name',
          // Examples are resolved from upstream dataset storage, not provided in code.
          examples: [],
        },
        task,
        trustUpstreamDataset: true,
      },
      selectedEvaluators
    );
  };
}
