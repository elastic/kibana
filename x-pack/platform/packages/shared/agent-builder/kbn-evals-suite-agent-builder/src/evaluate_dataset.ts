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

const WORKFLOW_EXECUTE_STEP_TOOL_ID = 'platform.workflows.workflow_execute_step';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const matchesWorkflowRequestExpectation = ({
  params,
  expectedPath,
  expectedStepType,
}: {
  params: unknown;
  expectedPath: string;
  expectedStepType: string;
}): boolean => {
  if (!isRecord(params)) return false;

  const yaml = params.yaml;
  if (typeof yaml === 'string') {
    const hasPath = yaml.includes(expectedPath);
    const hasStepType = yaml.includes(`type: ${expectedStepType}`);
    if (hasPath && hasStepType) return true;
  }

  const step = params.step;
  if (!isRecord(step)) return false;

  const stepType = step.type;
  const withArgs = step.with;
  if (!isRecord(withArgs)) return false;

  return stepType === expectedStepType && withArgs.path === expectedPath;
};

const extractWorkflowExecuteParams = (output: TaskOutput): unknown[] => {
  const steps = (output as { steps?: unknown[] }).steps;
  if (!Array.isArray(steps)) return [];

  return steps
    .filter((step): step is Record<string, unknown> => isRecord(step))
    .filter((step) => step.type === 'tool_call' && step.tool_id === WORKFLOW_EXECUTE_STEP_TOOL_ID)
    .map((step) => step.params)
    .filter((params) => params != null);
};

const GET_STEP_DEFINITIONS_TOOL_ID = 'platform.workflows.get_step_definitions';

/**
 * Full workflow_execute_step tool-call records (with index in the original
 * step sequence) so B3-feature evaluators can inspect both the params the LLM
 * sent and the result the tool returned, and reason about ordering relative
 * to other tool calls (e.g. discovery-first pattern).
 *
 * Shape returned by createToolResult in workflow_execute_step_tool.ts:
 *   { results: [{ type: 'other', data: { success, error?, parseError?, reason?, ... } }] }
 */
interface WorkflowExecuteStepRecord {
  index: number;
  params: Record<string, unknown> | null;
  data: Record<string, unknown> | null;
}

const extractWorkflowExecuteStepRecords = (output: TaskOutput): WorkflowExecuteStepRecord[] => {
  const steps = (output as { steps?: unknown[] }).steps;
  if (!Array.isArray(steps)) return [];

  return steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => isRecord(step))
    .filter(
      ({ step }) =>
        (step as Record<string, unknown>).type === 'tool_call' &&
        (step as Record<string, unknown>).tool_id === WORKFLOW_EXECUTE_STEP_TOOL_ID
    )
    .map(({ step, index }) => {
      const s = step as Record<string, unknown>;
      const results = Array.isArray(s.results) ? s.results : [];
      const firstResult = results.find((r): r is Record<string, unknown> => isRecord(r));
      const data =
        firstResult && isRecord(firstResult.data)
          ? (firstResult.data as Record<string, unknown>)
          : null;
      return {
        index,
        params: isRecord(s.params) ? (s.params as Record<string, unknown>) : null,
        data,
      };
    });
};

const firstGetStepDefinitionsIndex = (output: TaskOutput): number | null => {
  const steps = (output as { steps?: unknown[] }).steps;
  if (!Array.isArray(steps)) return null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!isRecord(step)) continue;
    if (step.type === 'tool_call' && step.tool_id === GET_STEP_DEFINITIONS_TOOL_ID) {
      return i;
    }
  }
  return null;
};

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
      name: 'ExpectedWorkflowRequest',
      kind: 'CODE' as const,
      evaluate: async ({ output, metadata }) => {
        const expectedPath = getStringMeta(metadata, 'expectedWorkflowRequestPath');
        if (!expectedPath) return { score: 1 };

        const expectedStepType =
          getStringMeta(metadata, 'expectedWorkflowStepType') ?? 'kibana.request';
        const workflowParams = extractWorkflowExecuteParams(output as TaskOutput);
        if (workflowParams.length === 0) {
          return {
            score: 0,
            metadata: {
              reason: 'No workflow execute step calls found',
              expectedPath,
              expectedStepType,
            },
          };
        }

        const matched = workflowParams.some((params) =>
          matchesWorkflowRequestExpectation({
            params,
            expectedPath,
            expectedStepType,
          })
        );

        return {
          score: matched ? 1 : 0,
          metadata: {
            expectedPath,
            expectedStepType,
            workflowCallCount: workflowParams.length,
          },
        };
      },
    },
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

        // Exclude infrastructure/framework tools that are always called regardless of user intent.
        // filestore.read is the skill-file loader — it's not a domain tool choice.
        const INFRA_TOOL_IDS = new Set(['filestore.read']);

        const toolCalls = getToolCallSteps(output as TaskOutput);
        const domainToolCalls = toolCalls.filter(
          (t) => t.tool_id && !INFRA_TOOL_IDS.has(t.tool_id)
        );

        if (domainToolCalls.length === 0) {
          return {
            score: 0,
            metadata: { reason: 'No domain tool calls found', expectedOnlyToolId },
          };
        }

        const usedToolIds = domainToolCalls.map((t) => t.tool_id).filter(Boolean);
        const hasExpected = usedToolIds.includes(expectedOnlyToolId);
        const allExpected = usedToolIds.every((id) => id === expectedOnlyToolId);

        return {
          score: hasExpected && allExpected ? 1 : 0,
          metadata: { expectedOnlyToolId, usedToolIds },
        };
      },
    },
    // ─────────────────────────────────────────────────────────────────────
    // B3 / v6 evaluators for the workflow-shaped alert-analysis variant.
    //
    // These fire on examples whose metadata carries `variantFamily: 'workflow'`
    // (i.e. the workflow-spec.ts pair). They short-circuit to `not_applicable`
    // on examples that never call platform.workflows.workflow_execute_step, so
    // it is safe to include them in dataset runs that mix workflow and
    // non-workflow examples.
    // ─────────────────────────────────────────────────────────────────────
    {
      name: 'Workflow_Yaml_Validity',
      kind: 'CODE' as const,
      evaluate: async ({ output, metadata }) => {
        if (getStringMeta(metadata, 'variantFamily') !== 'workflow') return { score: 1 };
        const records = extractWorkflowExecuteStepRecords(output as TaskOutput);
        if (records.length === 0) {
          return { score: null, label: 'not_applicable' };
        }

        // YAML parse failure is signalled by `parseError` on the result data
        // (see workflow_execute_step_tool.ts:826-830).
        const failures = records.filter((r) => r.data?.parseError != null).length;
        const valid = records.length - failures;
        return {
          score: valid / records.length,
          metadata: {
            workflowCallCount: records.length,
            yamlValidCount: valid,
            yamlFailureCount: failures,
          },
        };
      },
    },
    {
      name: 'Workflow_PreValidation_PassRate',
      kind: 'CODE' as const,
      evaluate: async ({ output, metadata }) => {
        if (getStringMeta(metadata, 'variantFamily') !== 'workflow') return { score: 1 };
        const records = extractWorkflowExecuteStepRecords(output as TaskOutput);
        if (records.length === 0) {
          return { score: null, label: 'not_applicable' };
        }

        // Among YAML-valid calls, count those that did NOT trip the
        // preValidateStepWith Zod check. The check returns a result with a
        // `reason` field (see workflow_execute_step_tool.ts:854-863). Mustache-
        // templated `with:` blocks are skipped by the validator and therefore
        // count as passing — that is the intentional B3 trade-off.
        const yamlValid = records.filter((r) => r.data?.parseError == null);
        if (yamlValid.length === 0) {
          return {
            score: 0,
            metadata: {
              reason: 'All workflow_execute_step calls failed YAML parse before pre-validation',
              workflowCallCount: records.length,
            },
          };
        }

        const preValidationFailures = yamlValid.filter((r) => r.data?.reason != null).length;
        const passed = yamlValid.length - preValidationFailures;
        return {
          score: passed / yamlValid.length,
          metadata: {
            workflowCallCount: records.length,
            yamlValidCount: yamlValid.length,
            preValidationPassedCount: passed,
            preValidationFailureCount: preValidationFailures,
          },
        };
      },
    },
    {
      name: 'Workflow_Execution_SuccessRate',
      kind: 'CODE' as const,
      evaluate: async ({ output, metadata }) => {
        if (getStringMeta(metadata, 'variantFamily') !== 'workflow') return { score: 1 };
        const records = extractWorkflowExecuteStepRecords(output as TaskOutput);
        if (records.length === 0) {
          return { score: null, label: 'not_applicable' };
        }

        // Among calls that passed YAML parse and pre-validation, count those
        // whose execution returned success=true (formatExecutionResult writes
        // success based on ExecutionStatus.COMPLETED — see line 380).
        const eligible = records.filter(
          (r) => r.data?.parseError == null && r.data?.reason == null
        );
        if (eligible.length === 0) {
          return {
            score: 0,
            metadata: {
              reason: 'No workflow_execute_step calls reached execution',
              workflowCallCount: records.length,
            },
          };
        }

        const succeeded = eligible.filter((r) => r.data?.success === true).length;
        return {
          score: succeeded / eligible.length,
          metadata: {
            workflowCallCount: records.length,
            executedCount: eligible.length,
            succeededCount: succeeded,
          },
        };
      },
    },
    {
      name: 'Discovery_First_Pattern_Usage',
      kind: 'CODE' as const,
      evaluate: async ({ output, metadata }) => {
        if (getStringMeta(metadata, 'variantFamily') !== 'workflow') return { score: 1 };
        const records = extractWorkflowExecuteStepRecords(output as TaskOutput);
        if (records.length === 0) {
          return { score: null, label: 'not_applicable' };
        }

        // Canary metric for whether the LLM is exercising B3's auto-schema
        // feature: was platform.workflows.get_step_definitions called BEFORE
        // the first workflow_execute_step in the same trace? Counts the
        // proportion of workflow_execute_step calls preceded by a discovery
        // call so multi-call traces are not penalised for caching the schema
        // after the first lookup.
        const firstDiscoveryIdx = firstGetStepDefinitionsIndex(output as TaskOutput);
        const precededCount = records.filter(
          (r) => firstDiscoveryIdx !== null && firstDiscoveryIdx < r.index
        ).length;

        return {
          score: precededCount / records.length,
          metadata: {
            workflowCallCount: records.length,
            firstGetStepDefinitionsIndex: firstDiscoveryIdx,
            precededByDiscoveryCount: precededCount,
          },
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
| WHERE trace_id == "${traceId}"
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
