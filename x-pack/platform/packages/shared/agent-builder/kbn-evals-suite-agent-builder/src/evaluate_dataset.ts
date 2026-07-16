/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type Evaluator,
  type Example,
  type EvaluationDataset,
  createQuantitativeGroundednessEvaluator,
  selectEvaluators,
  withEvaluatorSpan,
  createSpanLatencyEvaluator,
  createExampleScopedSkillInvocationEvaluator,
  buildSkillInvokedCaseExpression,
  createTrajectoryEvaluator,
  createRagEvaluators,
  type GroundTruth,
  type ExperimentTask,
  type TaskOutput,
} from '@kbn/evals';
import { createAgentBuilderCorrectnessEvaluators } from '@kbn/evals-extensions';
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
import { isInternalTool } from '@kbn/agent-builder-common/tools';
import type { AgentBuilderEvaluationChatClient } from './chat_client';
import type { WorkflowValidationClient } from './workflow_validation_client';
import { extractWorkflowYaml } from './workflow_validation_client';
import { extractSearchRetrievedDocs } from './rag_extractor';

interface DatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    expected?: string;
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

const FILESTORE_READ_TOOL_ID = 'filestore.read';
const FIND_RULES_TOOL_ID = 'security.find_rules';
const DISCOVER_RULE_TAGS_TOOL_ID = 'security.discover_rule_tags';

function isFindRulesRoutingMetadata(metadata?: DatasetExample['metadata']): boolean {
  const expectedOnlyToolId = getStringMeta(metadata, 'expectedOnlyToolId');
  const category = getStringMeta(metadata, 'category');
  return expectedOnlyToolId === FIND_RULES_TOOL_ID || category === 'find-rules';
}

export function allowedDomainToolIdsForExample(
  metadata?: DatasetExample['metadata']
): string[] | null {
  const expectedOnlyToolId = getStringMeta(metadata, 'expectedOnlyToolId');
  if (!expectedOnlyToolId) {
    return null;
  }
  if (isFindRulesRoutingMetadata(metadata)) {
    return [DISCOVER_RULE_TAGS_TOOL_ID, FIND_RULES_TOOL_ID];
  }
  return [expectedOnlyToolId];
}

function collectUniqueExpectedSkills(examples: DatasetExample[]): string[] {
  const names = new Set<string>();
  let needsDataExploration = false;

  for (const example of examples) {
    const expectedSkill = getStringMeta(example.metadata, 'expectedSkill');
    if (expectedSkill) {
      names.add(expectedSkill);
      continue;
    }
    if (getStringMeta(example.metadata, 'shouldNotActivateSkill')) {
      continue;
    }
    needsDataExploration = true;
  }

  if (needsDataExploration || examples.length === 0) {
    names.add('data-exploration');
  }

  return [...names];
}

function hasShouldNotActivateExamples(examples: DatasetExample[]): boolean {
  return examples.some((example) =>
    Boolean(getStringMeta(example.metadata, 'shouldNotActivateSkill'))
  );
}

function resolveTrajectoryGolden(metadata?: DatasetExample['metadata']): string[] {
  const toolSequence = metadata?.tool_sequence;
  if (Array.isArray(toolSequence)) {
    return toolSequence.filter((id): id is string => typeof id === 'string' && id.length > 0);
  }
  const expectedOnlyToolId = getStringMeta(metadata, 'expectedOnlyToolId');
  if (expectedOnlyToolId) {
    return [expectedOnlyToolId];
  }
  const expectedToolId = getStringMeta(metadata, 'expectedToolId');
  return expectedToolId ? [expectedToolId] : [];
}

const createAgentBuilderTrajectoryEvaluator = (): Evaluator<DatasetExample, TaskOutput> => {
  const inner = createTrajectoryEvaluator({
    extractToolCalls: (output) =>
      getToolCallSteps(output as TaskOutput)
        .map((step) => step.tool_id)
        .filter((id): id is string => Boolean(id) && id !== FILESTORE_READ_TOOL_ID),
    goldenPathExtractor: (expected) => {
      const exp = expected as { tool_sequence?: string[] } | undefined;
      return exp?.tool_sequence ?? [];
    },
    orderWeight: 0.6,
    coverageWeight: 0.4,
  });

  return {
    ...inner,
    name: 'Trajectory',
    evaluate: async (args) => {
      const golden = resolveTrajectoryGolden(args.metadata as DatasetExample['metadata']);
      if (golden.length === 0) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'No tool trajectory annotation — skipping trajectory evaluation.',
        };
      }
      return inner.evaluate({
        ...args,
        expected: { ...(args.expected as object), tool_sequence: golden },
      });
    },
  } as Evaluator<DatasetExample, TaskOutput>;
};

interface WorkflowValidationOutput {
  outcome: string;
  authored_yaml?: string;
  create_valid?: boolean;
  workflow_id?: string;
  execution_id?: string;
  exec_status?: string;
  create_error?: string;
  exec_error?: string;
  step_statuses?: ReadonlyArray<{ step?: string; status?: string }>;
}

/**
 * L4 evaluator: validates that authored workflow YAML was successfully created
 * and executed end-to-end. Reads from task output's `wfValidation` detail,
 * which is populated when `metadata.validateWorkflow` is true.
 *
 * Score: 1 = fully validated (completed), 0.5 = partial (created but step failures),
 * 0 = no YAML, creation failed, or run failed.
 */
const createWorkflowValidationEvaluator = (): Evaluator => ({
  name: 'WorkflowValidation',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const wf = (output as Record<string, unknown> | undefined)?.wfValidation as
      | WorkflowValidationOutput
      | undefined;

    if (!wf) {
      return { score: 0, label: 'no_workflow_detail' };
    }

    const outcome = wf.outcome ?? '';
    const hasError = Boolean(wf.create_error || wf.exec_error);
    const created = wf.create_valid === true || Boolean(wf.workflow_id);
    const executed = Boolean(wf.exec_status);

    if (outcome === 'no_yaml' || (!wf.authored_yaml && !created)) {
      return { score: 0, label: 'no_yaml_authored' };
    }

    if (!created || hasError) {
      return {
        score: 0,
        label: outcome || 'creation_failed',
        explanation: wf.create_error ?? wf.exec_error ?? undefined,
      };
    }

    if (!executed) {
      return { score: 0.5, label: 'created_not_executed' };
    }

    const stepFailures = (wf.step_statuses ?? []).filter(
      (s) => s.status && s.status !== 'completed' && s.status !== 'success'
    );

    if (stepFailures.length > 0) {
      return {
        score: 0.5,
        label: 'step_failures',
        explanation: stepFailures.map((s) => `${s.step}: ${s.status}`).join(', '),
      };
    }

    return { score: 1, label: outcome || 'validated' };
  },
});

/**
 * Builds a deterministic CODE evaluator that asserts the final assistant message contains every
 * string listed under `metadata[metadataKey]`. Returns score 1 when the metadata key is absent or
 * empty, so datasets that don't opt in are unaffected. Matching is case-insensitive, and `missing`
 * is derived with the same rule so the debug metadata never contradicts the score.
 */
const createRequiredTermsEvaluator = ({
  name,
  metadataKey,
}: {
  name: string;
  metadataKey: string;
}): Evaluator => ({
  name,
  kind: 'CODE',
  evaluate: async ({ output, metadata }) => {
    const raw = metadata?.[metadataKey];
    const required = Array.isArray(raw)
      ? (raw as unknown[]).filter((term): term is string => typeof term === 'string')
      : [];
    if (required.length === 0) return { score: 1 };

    const answer = getFinalAssistantMessage(output as TaskOutput);
    const lowerAnswer = answer.toLowerCase();
    const missing = required.filter((term) => !lowerAnswer.includes(term.toLowerCase()));

    return {
      score: missing.length === 0 ? 1 : 0,
      metadata: {
        [metadataKey]: required,
        missing,
        answerPreview: answer.slice(0, 600),
      },
    };
  },
});

function configureExperiment({
  evaluators,
  chatClient,
  workflowValidationClient,
  traceEsClient,
  log,
  examples = [],
}: {
  evaluators: DefaultEvaluators;
  chatClient: AgentBuilderEvaluationChatClient;
  workflowValidationClient?: WorkflowValidationClient;
  traceEsClient: EsClient;
  log: ToolingLog;
  examples?: DatasetExample[];
}): {
  task: ExperimentTask<DatasetExample, TaskOutput>;
  evaluators: Evaluator<DatasetExample, TaskOutput>[];
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

    // Workflow validation: when a dataset example opts in via metadata.validateWorkflow,
    // extract authored YAML from the converse response and validate it end-to-end
    // (create → enable → run → poll). The result is scored by the WorkflowValidation evaluator.
    let wfValidation: WorkflowValidationOutput | undefined;
    const shouldValidateWorkflow = getBooleanMeta(metadata, 'validateWorkflow');
    if (shouldValidateWorkflow && workflowValidationClient) {
      const finalMessage = getFinalAssistantMessage(response as TaskOutput);
      const label = `${input.question.slice(0, 60)}`;
      try {
        const result = await workflowValidationClient.validateAuthoredWorkflow(finalMessage, label);
        wfValidation = {
          outcome: result.outcome,
          authored_yaml: result.authoredYaml,
          create_valid: result.createValid === true,
          workflow_id: result.workflowId,
          execution_id: result.executionId,
          exec_status: result.execStatus,
          create_error: result.createError || undefined,
          exec_error: result.execError || undefined,
          step_statuses: result.stepStatuses,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.warning(`Workflow validation threw for ${label}: ${message}`);
        wfValidation = {
          outcome: 'create_failed',
          authored_yaml: extractWorkflowYaml(finalMessage),
          create_valid: false,
          create_error: message,
          step_statuses: [],
        };
      }
    }

    return {
      errors: response.errors,
      messages: response.messages,
      steps: response.steps,
      traceId: response.traceId,
      correctnessAnalysis: correctnessResult?.metadata,
      groundednessAnalysis: groundednessResult?.metadata,
      wfValidation,
    };
  };

  const ragEvaluators = createRagEvaluators({
    k: 10,
    relevanceThreshold: 1,
    extractRetrievedDocs: extractSearchRetrievedDocs,
    extractGroundTruth: (referenceOutput: DatasetExample['output']) =>
      referenceOutput?.groundTruth ?? {},
  });

  const selectedEvaluators = selectEvaluators<DatasetExample, TaskOutput>([
    {
      name: 'ExpectedToolCalled',
      kind: 'CODE' as const,
      evaluate: async ({ output, metadata }) => {
        const expectedToolId = getStringMeta(metadata, 'expectedToolId');
        if (!expectedToolId) return { score: 1 };

        const toolCalls = getToolCallSteps(output as TaskOutput);
        if (toolCalls.length === 0) {
          return { score: 0, metadata: { reason: 'No tool calls found', expectedToolId } };
        }

        const usedToolIds = toolCalls.map((t) => t.tool_id).filter(Boolean);
        const invoked = usedToolIds.includes(expectedToolId);

        return {
          score: invoked ? 1 : 0,
          metadata: { expectedToolId, usedToolIds },
        };
      },
    },
    {
      name: 'ToolUsageOnly',
      kind: 'CODE' as const,
      evaluate: async ({ output, metadata }) => {
        const expectedOnlyToolId = getStringMeta(metadata, 'expectedOnlyToolId');
        if (!expectedOnlyToolId) return { score: 1 };

        // Exclude attachment/filestore/internal framework tools (see isInternalTool).
        const toolCalls = getToolCallSteps(output as TaskOutput);
        const domainToolCalls = toolCalls.filter((t) => t.tool_id && !isInternalTool(t.tool_id));

        if (domainToolCalls.length === 0) {
          return {
            score: 0,
            metadata: { reason: 'No domain tool calls found', expectedOnlyToolId },
          };
        }

        const usedToolIds = domainToolCalls
          .map((t) => t.tool_id)
          .filter((id): id is string => Boolean(id));
        const allowedToolIds = allowedDomainToolIdsForExample(metadata) ?? [expectedOnlyToolId];
        const hasExpected = usedToolIds.includes(expectedOnlyToolId);
        const allAllowed = usedToolIds.every((id) => allowedToolIds.includes(id));

        return {
          score: hasExpected && allAllowed ? 1 : 0,
          metadata: { expectedOnlyToolId, allowedToolIds, usedToolIds },
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
    // Asserts seeded alert _ids appear verbatim in the final response (alert-triage grounded evals).
    createRequiredTermsEvaluator({
      name: 'RequiredAlertIdsInResponse',
      metadataKey: 'requiredAlertIds',
    }),
    // Guards that literal terms (e.g. seeded risk scores) appear in the final response, catching
    // regressions where the tool silently reads 0 for fields like kibana.alert.risk_score.
    createRequiredTermsEvaluator({ name: 'RequiredTermsInResponse', metadataKey: 'requiredTerms' }),
    ...createAgentBuilderCorrectnessEvaluators(),
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
    ...collectUniqueExpectedSkills(examples).map((skillName) =>
      createExampleScopedSkillInvocationEvaluator({
        traceEsClient,
        log,
        skillName,
        resolveContext: ({ metadata }) => ({
          expectedSkill: getStringMeta(metadata, 'expectedSkill'),
          shouldNotActivateSkill: getStringMeta(metadata, 'shouldNotActivateSkill'),
        }),
      })
    ),
    createAgentBuilderTrajectoryEvaluator(),
    ...(hasShouldNotActivateExamples(examples)
      ? [
          {
            name: 'ExpectedSkillInvocation',
            kind: 'CODE' as const,
            evaluate: async ({ output, metadata }) => {
              const shouldNotActivate = getStringMeta(metadata, 'shouldNotActivateSkill');
              if (!shouldNotActivate) {
                return { score: 1 };
              }
              if (!/^[a-zA-Z0-9_-]+$/.test(shouldNotActivate)) {
                return {
                  score: null,
                  label: 'error',
                  explanation: `Invalid skill name: ${shouldNotActivate}`,
                };
              }

              const traceId = (output as Record<string, unknown>)?.traceId as string | undefined;
              if (!traceId) {
                return {
                  score: null,
                  label: 'unavailable',
                  explanation: 'No traceId available for skill invocation check',
                };
              }
              if (!/^[a-zA-Z0-9_-]+$/.test(traceId)) {
                return {
                  score: null,
                  label: 'error',
                  explanation: `Invalid traceId for skill invocation check: ${traceId}`,
                };
              }

              const query = `FROM traces-*
| WHERE trace.id == "${traceId}"
| STATS skill_invoked = COUNT(
    CASE(
      ${buildSkillInvokedCaseExpression(shouldNotActivate)},
      1,
      NULL
    )
  )`;

              try {
                const response = (await traceEsClient.esql.query({ query })) as unknown as {
                  values: number[][];
                };
                const invoked = (response.values?.[0]?.[0] ?? 0) > 0;
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
          } satisfies Evaluator<DatasetExample, TaskOutput>,
        ]
      : []),
    createWorkflowValidationEvaluator(),
  ]);

  return { task, evaluators: selectedEvaluators };
}

export function createEvaluateDataset({
  evaluators,
  executorClient,
  chatClient,
  workflowValidationClient,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  chatClient: AgentBuilderEvaluationChatClient;
  workflowValidationClient?: WorkflowValidationClient;
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
      workflowValidationClient,
      traceEsClient,
      log,
      examples,
    });

    await executorClient.runExperiment(
      {
        datasets: [dataset],
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
  workflowValidationClient,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  chatClient: AgentBuilderEvaluationChatClient;
  workflowValidationClient?: WorkflowValidationClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}): EvaluateExternalDataset {
  return async function evaluateExternalDataset(datasetName: string) {
    const resolvesFromPhoenix = process.env.KBN_EVALS_EXECUTOR === 'phoenix';
    const { task, evaluators: selectedEvaluators } = configureExperiment({
      evaluators,
      chatClient,
      workflowValidationClient,
      traceEsClient,
      log,
      examples: [],
    });

    await executorClient.runExperiment(
      {
        datasets: [
          {
            name: datasetName,
            description: resolvesFromPhoenix
              ? 'External dataset resolved from Phoenix by name'
              : 'External dataset resolved from Elasticsearch by name',
            // Examples are resolved from upstream dataset storage, not provided in code.
            examples: [],
          },
        ],
        task,
        trustUpstreamDataset: true,
      },
      selectedEvaluators
    );
  };
}
