/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_DETECTOR_RULE_ACTION } from '@kbn/ml-anomaly-utils';

export interface MlCustomRulesUsage {
  total_count: number;
  jobs_with_rules_count: number;
  detectors_with_rules_count: number;
  count_by_action: {
    skip_result: number;
    skip_model_update: number;
  };
  count_with_conditions: number;
  count_with_scope: number;
}

export const emptyCustomRulesUsage = (): MlCustomRulesUsage => ({
  total_count: 0,
  jobs_with_rules_count: 0,
  detectors_with_rules_count: 0,
  count_by_action: {
    skip_result: 0,
    skip_model_update: 0,
  },
  count_with_conditions: 0,
  count_with_scope: 0,
});

export function aggregateCustomRulesUsageFromJobs(
  jobs: ReadonlyArray<{
    analysis_config?: {
      detectors?: ReadonlyArray<{
        custom_rules?: ReadonlyArray<{
          actions?: ReadonlyArray<string>;
          conditions?: ReadonlyArray<unknown>;
          scope?: Record<string, unknown>;
        }>;
      }>;
    };
  }>
): MlCustomRulesUsage {
  let totalCount = 0;
  let jobsWithRules = 0;
  let detectorsWithRules = 0;
  let skipResult = 0;
  let skipModelUpdate = 0;
  let withConditions = 0;
  let withScope = 0;

  for (const job of jobs) {
    const detectors = job.analysis_config?.detectors ?? [];
    let jobHasRule = false;

    for (const detector of detectors) {
      const rules = detector.custom_rules ?? [];
      if (rules.length > 0) {
        jobHasRule = true;
        detectorsWithRules++;
      }

      for (const rule of rules) {
        totalCount++;
        const actions = rule.actions ?? [];
        if (actions.includes(ML_DETECTOR_RULE_ACTION.SKIP_RESULT)) {
          skipResult++;
        }
        if (actions.includes(ML_DETECTOR_RULE_ACTION.SKIP_MODEL_UPDATE)) {
          skipModelUpdate++;
        }
        if (rule.conditions !== undefined && rule.conditions.length > 0) {
          withConditions++;
        }
        if (rule.scope !== undefined && Object.keys(rule.scope).length > 0) {
          withScope++;
        }
      }
    }

    if (jobHasRule) {
      jobsWithRules++;
    }
  }

  return {
    total_count: totalCount,
    jobs_with_rules_count: jobsWithRules,
    detectors_with_rules_count: detectorsWithRules,
    count_by_action: {
      skip_result: skipResult,
      skip_model_update: skipModelUpdate,
    },
    count_with_conditions: withConditions,
    count_with_scope: withScope,
  };
}
