/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_DETECTOR_RULE_ACTION } from '@kbn/ml-anomaly-utils';
import {
  aggregateCustomRulesUsageFromJobs,
  emptyCustomRulesUsage,
} from './custom_rules_usage_aggregation';

describe('emptyCustomRulesUsage', () => {
  it('returns all zeroes', () => {
    expect(emptyCustomRulesUsage()).toEqual({
      total_count: 0,
      jobs_with_rules_count: 0,
      detectors_with_rules_count: 0,
      count_by_action: { skip_result: 0, skip_model_update: 0 },
      count_with_conditions: 0,
      count_with_scope: 0,
    });
  });
});

describe('aggregateCustomRulesUsageFromJobs', () => {
  it('returns zeroes for empty jobs array', () => {
    expect(aggregateCustomRulesUsageFromJobs([])).toEqual(emptyCustomRulesUsage());
  });

  it('handles jobs with no analysis_config', () => {
    expect(aggregateCustomRulesUsageFromJobs([{}])).toEqual(emptyCustomRulesUsage());
  });

  it('handles detectors with no custom_rules', () => {
    const jobs = [{ analysis_config: { detectors: [{}, {}] } }];
    expect(aggregateCustomRulesUsageFromJobs(jobs)).toEqual(emptyCustomRulesUsage());
  });

  it('counts rules, jobs, detectors, actions, conditions, and scope', () => {
    const jobs = [
      {
        analysis_config: {
          detectors: [
            {
              custom_rules: [
                {
                  actions: [ML_DETECTOR_RULE_ACTION.SKIP_RESULT],
                  conditions: [{ applies_to: 'actual' }],
                  scope: { partition_field: { filter_id: 'f1' } },
                },
                {
                  actions: [
                    ML_DETECTOR_RULE_ACTION.SKIP_RESULT,
                    ML_DETECTOR_RULE_ACTION.SKIP_MODEL_UPDATE,
                  ],
                  conditions: [],
                },
              ],
            },
            { custom_rules: [] },
          ],
        },
      },
      {
        analysis_config: {
          detectors: [
            {
              custom_rules: [
                {
                  actions: [ML_DETECTOR_RULE_ACTION.SKIP_MODEL_UPDATE],
                },
              ],
            },
          ],
        },
      },
    ];

    expect(aggregateCustomRulesUsageFromJobs(jobs)).toEqual({
      total_count: 3,
      jobs_with_rules_count: 2,
      detectors_with_rules_count: 2,
      count_by_action: {
        skip_result: 2,
        skip_model_update: 2,
      },
      count_with_conditions: 1,
      count_with_scope: 1,
    });
  });

  it('counts multiple detectors with rules in one job as one job_with_rules', () => {
    const jobs = [
      {
        analysis_config: {
          detectors: [{ custom_rules: [{ actions: [] }] }, { custom_rules: [{ actions: [] }] }],
        },
      },
    ];
    const result = aggregateCustomRulesUsageFromJobs(jobs);
    expect(result.jobs_with_rules_count).toBe(1);
    expect(result.detectors_with_rules_count).toBe(2);
    expect(result.total_count).toBe(2);
  });
});
