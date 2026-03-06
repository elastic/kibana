/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseFeature } from '@kbn/streams-schema';
import type { BoundInferenceClient, ToolChoice } from '@kbn/inference-common';
import type { DeletedFeatureSummary, IgnoredFeature } from '@kbn/streams-ai';
import { SoftDeleteCompliancePrompt } from './soft_delete_evaluator_prompt';

export interface SoftDeleteTaskOutput {
  initialFeatures: BaseFeature[];
  deletedFeatures: DeletedFeatureSummary[];
  followUpRuns: Array<{
    features: BaseFeature[];
    rawFeatures: BaseFeature[];
    ignoredFeatures: IgnoredFeature[];
  }>;
}

export const createSoftDeleteSemanticEvaluator = ({
  inferenceClient,
}: {
  inferenceClient: BoundInferenceClient;
}) => ({
  name: 'llm_soft_delete_compliance',
  kind: 'LLM' as const,
  evaluate: async ({ output }: { output: SoftDeleteTaskOutput & { traceId: string | null } }) => {
    const { initialFeatures, deletedFeatures, followUpRuns } = output;

    if (deletedFeatures.length === 0) {
      return {
        score: undefined,
        explanation:
          'Inconclusive: initial identification did not return enough features to fulfill the requested deletion count',
      };
    }

    if (followUpRuns.length === 0) {
      return { score: 1, explanation: 'Nothing to evaluate' };
    }

    const allFollowUpFeatures = followUpRuns.flatMap((run) => run.features);

    if (allFollowUpFeatures.length === 0) {
      const allDeleted = initialFeatures.length === deletedFeatures.length;
      const filteringPerRun = followUpRuns.map((run) => ({
        raw_features: run.rawFeatures.length,
        llm_ignored: run.ignoredFeatures.length,
        code_filtered: run.rawFeatures.length - run.features.length,
      }));
      return {
        score: allDeleted ? 1 : 0,
        explanation: allDeleted
          ? 'All initial features were deleted, no features expected in follow-up runs'
          : `Follow-up runs returned 0 features, but only ${deletedFeatures.length} of ${initialFeatures.length} were deleted — the remaining features should have been preserved`,
        metadata: {
          initial_features_count: initialFeatures.length,
          deleted_count: deletedFeatures.length,
          follow_up_runs: followUpRuns.length,
          filtering_per_run: filteringPerRun,
        },
      };
    }

    const followUpRunsGrouped = followUpRuns.map((run, runIndex) => ({
      run_index: runIndex,
      features: run.features.map(({ id, type, subtype, title, properties, description }) => ({
        id,
        type,
        subtype,
        title,
        properties,
        description,
      })),
    }));

    const response = await inferenceClient.prompt({
      prompt: SoftDeleteCompliancePrompt,
      input: {
        deleted_features: JSON.stringify(deletedFeatures),
        follow_up_runs: JSON.stringify(followUpRunsGrouped),
      },
      toolChoice: {
        function: 'analyze',
      } as ToolChoice,
    });

    const toolCall = response.toolCalls[0];
    if (!toolCall) {
      throw new Error('No tool call found in LLM response');
    }

    const { violations, explanation } = toolCall.function.arguments;

    const perRunScores = followUpRuns.map((run, runIndex) => {
      const runViolationCount = violations.filter((v) => v.run_index === runIndex).length;
      const llmIgnored = run.ignoredFeatures.length;
      const codeFiltered = run.rawFeatures.length - run.features.length;
      return {
        score: Math.max(0, 1 - runViolationCount / deletedFeatures.length),
        violations: runViolationCount,
        llm_ignored: llmIgnored,
        code_filtered: codeFiltered,
      };
    });

    const score = perRunScores.reduce((sum, r) => sum + r.score, 0) / perRunScores.length;

    const totalLlmIgnored = perRunScores.reduce((sum, r) => sum + r.llm_ignored, 0);
    const totalCodeFiltered = perRunScores.reduce((sum, r) => sum + r.code_filtered, 0);

    return {
      score,
      explanation,
      metadata: {
        initial_features_count: initialFeatures.length,
        deleted_count: deletedFeatures.length,
        follow_up_runs: followUpRuns.length,
        follow_up_features_count: allFollowUpFeatures.length,
        violations_count: violations.length,
        per_run_scores: perRunScores,
        violations,
        llm_ignored_count: totalLlmIgnored,
        code_filtered_count: totalCodeFiltered,
      },
    };
  },
});
