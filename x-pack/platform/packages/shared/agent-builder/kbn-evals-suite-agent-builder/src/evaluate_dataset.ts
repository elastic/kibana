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
  type CorrectnessAnalysis,
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
import { isInternalTool } from '@kbn/agent-builder-common/tools';
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
    goldenPathExtractor: () => [],
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

// Per-claim weights, mirroring the shared `CLAIM_FACTUAL_SCORE_MAP` in
// @kbn/evals correctness/scoring.ts. Duplicated here so this fork is
// self-contained and does not mutate the shared scorer's behaviour for the
// other framework that consumes it.
const CLAIM_FACTUAL_SCORE_MAP = {
  FULLY_SUPPORTED: 1.0,
  PARTIALLY_SUPPORTED: { central: 0.9, peripheral: 0.95 },
  CONTRADICTED: { central: 0.0, peripheral: 0.1 },
  NOT_IN_GROUND_TRUTH: { central: 0.1, peripheral: 0.5 },
} as const;

/**
 * Agent-builder fork of the shared Factuality scorer.
 *
 * The shared `calculateFactualScore` (kbn-evals) computes a geometric mean over
 * ALL claims, including `NOT_IN_GROUND_TRUTH` (statements the reference neither
 * supports nor contradicts). Because the mean is a product, each such extra
 * claim multiplicatively crushes the score: a fully accurate answer that is
 * richer than a (often thin) reference lands at a uniform ~0.1–0.3,
 * indistinguishable from a genuinely inaccurate one. This is worst where ground
 * truth is sparsest (e.g. multi-turn), and is a scoring artifact, not a model
 * gap (see elastic/security-team#18060).
 *
 * This fork scores factuality only over the claims that CAN be checked against
 * the reference (FULLY_SUPPORTED / PARTIALLY_SUPPORTED / CONTRADICTED), so a
 * grounded-but-richer answer is no longer penalized for its extra detail.
 * Reference coverage is already measured separately by the Relevance score.
 * The deliberate geometric-mean intent is preserved: a single contradicted
 * central claim still tanks the score to 0. When every claim is unverifiable
 * (no reference overlap at all) the original behaviour is retained so a fully
 * off-reference answer is not rewarded with a perfect score.
 *
 * Scoped to the agent-builder/security suites — the shared scorer is untouched,
 * so the context-engine framework's numbers do not diverge (per reviewer
 * guidance on #276536).
 */
const calculateAgentBuilderFactualScore = (
  correctnessEvaluation: CorrectnessAnalysis
): number => {
  const analysis = correctnessEvaluation?.analysis;
  if (!analysis || !Array.isArray(analysis) || analysis.length === 0) {
    return 0.0;
  }

  const verifiableClaims = analysis.filter(
    (claim) => (claim.verdict || 'NOT_IN_GROUND_TRUTH') !== 'NOT_IN_GROUND_TRUTH'
  );
  const scoredClaims = verifiableClaims.length > 0 ? verifiableClaims : analysis;

  let productOfScores = 1.0;
  for (const claim of scoredClaims) {
    const verdict = claim.verdict || 'NOT_IN_GROUND_TRUTH';
    const centrality = claim.centrality || 'peripheral';
    const scoreMapEntry = CLAIM_FACTUAL_SCORE_MAP[verdict as keyof typeof CLAIM_FACTUAL_SCORE_MAP];
    let claimScore = 0.0;
    if (typeof scoreMapEntry === 'object') {
      claimScore = scoreMapEntry[centrality as keyof typeof scoreMapEntry] || 0.0;
    } else if (typeof scoreMapEntry === 'number') {
      claimScore = scoreMapEntry;
    }
    productOfScores *= claimScore;
  }

  const numClaims = scoredClaims.length;
  return productOfScores > 0 ? Math.pow(productOfScores, 1 / numClaims) : 0.0;
};
export { calculateAgentBuilderFactualScore };

/**
 * Agent-builder correctness evaluators: wraps the shared
 * `createQuantitativeCorrectnessEvaluators` and overrides ONLY the Factuality
 * score with `calculateAgentBuilderFactualScore` (NOT_IN_GROUND_TRUTH-excluded
 * geometric mean). Relevance and Sequence Accuracy are reused unchanged from
 * the shared factory. Mirrors the existing `createAgentBuilderTrajectoryEvaluator`
 * pattern of forking a shared kbn-evals primitive into the agent-builder scope.
 */
const createAgentBuilderCorrectnessEvaluators = (): Evaluator[] => {
  const shared = createQuantitativeCorrectnessEvaluators();
  return shared.map((evaluator) =>
    evaluator.name === 'Factuality'
      ? {
          ...evaluator,
          evaluate: async (args) => {
            const correctnessAnalysis = ((args.output as any)?.correctnessAnalysis ??
              null) as CorrectnessAnalysis | null;
            if (!correctnessAnalysis) {
              return {
                score: null,
                label: 'unavailable',
                explanation: 'No correctness analysis available',
                metadata: (args.metadata ?? undefined) as object | undefined,
              };
            }
            const score = calculateAgentBuilderFactualScore(correctnessAnalysis);
            const summaryText = correctnessAnalysis.summary.factual_accuracy_summary;
            return {
              score,
              label: summaryText,
              explanation: summaryText,
              metadata: { ...((args.metadata as object) ?? {}), correctnessAnalysis },
            };
          },
        }
      : evaluator
  );
};

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
  traceEsClient,
  log,
  examples = [],
}: {
  evaluators: DefaultEvaluators;
  chatClient: AgentBuilderEvaluationChatClient;
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
