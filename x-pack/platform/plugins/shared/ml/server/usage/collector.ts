/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { MlAnomalyResultType } from '@kbn/ml-anomaly-utils';
import { ML_ALERT_TYPES } from '../../common/constants/alerts';
import type { MlAnomalyDetectionJobsHealthRuleParams } from '../../common/types/alerts';
import { getResultJobsHealthRuleConfig } from '../../common/util/alerts';
import {
  aggregateCustomRulesUsageFromJobs,
  emptyCustomRulesUsage,
  type MlCustomRulesUsage,
} from './custom_rules_usage_aggregation';

export type { MlCustomRulesUsage };

export interface MlUsageData {
  alertRules: {
    'xpack.ml.anomaly_detection_alert': {
      count_by_result_type: {
        record: number;
        bucket: number;
        influencer: number;
      };
      count_with_kql_filter: {
        record: number;
        influencer: number;
      };
    };
    'xpack.ml.anomaly_detection_jobs_health': {
      count_by_check_type: {
        datafeed: number;
        mml: number;
        delayedData: number;
        errorMessages: number;
      };
    };
  };
  customRules: MlCustomRulesUsage;
}

export function registerCollector(
  usageCollection: UsageCollectionSetup,
  getIndexForType: (type: string) => Promise<string>
) {
  const collector = usageCollection.makeUsageCollector<MlUsageData>({
    type: 'ml',
    schema: {
      alertRules: {
        'xpack.ml.anomaly_detection_alert': {
          count_by_result_type: {
            record: {
              type: 'long',
              _meta: { description: 'total number of alerting rules using record result type' },
            },
            influencer: {
              type: 'long',
              _meta: { description: 'total number of alerting rules using influencer result type' },
            },
            bucket: {
              type: 'long',
              _meta: { description: 'total number of alerting rules using bucket result type' },
            },
          },
          count_with_kql_filter: {
            record: {
              type: 'long',
              _meta: {
                description:
                  'total number of alerting rules using record result type with a KQL filter',
              },
            },
            influencer: {
              type: 'long',
              _meta: {
                description:
                  'total number of alerting rules using influencer result type with a KQL filter',
              },
            },
          },
        },
        'xpack.ml.anomaly_detection_jobs_health': {
          count_by_check_type: {
            datafeed: {
              type: 'long',
              _meta: {
                description:
                  'total number of alerting rules performing the not started datafeed health check',
              },
            },
            mml: {
              type: 'long',
              _meta: {
                description:
                  'total number of alerting rules performing the model memory limit health check',
              },
            },
            delayedData: {
              type: 'long',
              _meta: {
                description:
                  'total number of alerting rules performing the delayed data health check',
              },
            },
            errorMessages: {
              type: 'long',
              _meta: {
                description:
                  'total number of alerting rules performing the error messages health check',
              },
            },
          },
        },
      },
      customRules: {
        total_count: {
          type: 'long',
          _meta: { description: 'Total number of custom rules across all detectors in all jobs' },
        },
        jobs_with_rules_count: {
          type: 'long',
          _meta: {
            description: 'Number of jobs that have at least one custom rule on any detector',
          },
        },
        detectors_with_rules_count: {
          type: 'long',
          _meta: {
            description: 'Number of detectors that have at least one custom rule',
          },
        },
        count_by_action: {
          skip_result: {
            type: 'long',
            _meta: { description: 'Number of rules with the skip_result action' },
          },
          skip_model_update: {
            type: 'long',
            _meta: { description: 'Number of rules with the skip_model_update action' },
          },
        },
        count_with_conditions: {
          type: 'long',
          _meta: { description: 'Number of rules that have one or more numeric conditions' },
        },
        count_with_scope: {
          type: 'long',
          _meta: { description: 'Number of rules that have scope (filter list) configuration' },
        },
      },
    },
    isReady: () => true,
    fetch: async ({ esClient }) => {
      const alertIndex = await getIndexForType('alert');
      const result = await esClient.search(
        {
          index: alertIndex,
          size: 0,
          query: {
            bool: {
              filter: [
                { term: { type: 'alert' } },
                {
                  term: {
                    'alert.alertTypeId': ML_ALERT_TYPES.ANOMALY_DETECTION,
                  },
                },
              ],
            },
          },
          aggs: {
            count_by_result_type: {
              terms: {
                field: 'alert.params.resultType',
                size: 3,
              },
              aggs: {
                with_kql_filter: {
                  filter: {
                    exists: {
                      field: 'alert.params.kqlQueryString',
                    },
                  },
                },
              },
            },
          },
        },
        { maxRetries: 0 }
      );

      const aggResponse = result.aggregations as {
        count_by_result_type: {
          buckets: Array<{
            key: MlAnomalyResultType;
            doc_count: number;
            with_kql_filter: {
              doc_count: number;
            };
          }>;
        };
      };

      const countByResultType =
        {} as MlUsageData['alertRules'][typeof ML_ALERT_TYPES.ANOMALY_DETECTION]['count_by_result_type'];
      const countWithKqlFilter =
        {} as MlUsageData['alertRules'][typeof ML_ALERT_TYPES.ANOMALY_DETECTION]['count_with_kql_filter'];

      for (const bucket of aggResponse.count_by_result_type.buckets) {
        countByResultType[bucket.key] = bucket.doc_count;
        // KQL filter is only available for record and influencer result types
        if (bucket.key !== 'bucket') {
          countWithKqlFilter[bucket.key] = bucket.with_kql_filter.doc_count;
        }
      }

      const jobsHealthRuleInstances = await esClient.search<{
        alert: {
          params: MlAnomalyDetectionJobsHealthRuleParams;
        };
      }>(
        {
          index: alertIndex,
          size: 10000,
          query: {
            bool: {
              filter: [
                { term: { type: 'alert' } },
                {
                  term: {
                    'alert.alertTypeId': ML_ALERT_TYPES.AD_JOBS_HEALTH,
                  },
                },
              ],
            },
          },
        },
        { maxRetries: 0 }
      );

      const resultsByCheckType = jobsHealthRuleInstances.hits.hits.reduce(
        (acc, curr) => {
          const doc = curr._source;
          if (!doc) return acc;

          const {
            alert: {
              params: { testsConfig },
            },
          } = doc;

          const resultConfig = getResultJobsHealthRuleConfig(testsConfig);

          acc.datafeed += resultConfig.datafeed.enabled ? 1 : 0;
          acc.mml += resultConfig.mml.enabled ? 1 : 0;
          acc.delayedData += resultConfig.delayedData.enabled ? 1 : 0;
          acc.errorMessages += resultConfig.errorMessages.enabled ? 1 : 0;

          return acc;
        },
        {
          datafeed: 0,
          mml: 0,
          delayedData: 0,
          errorMessages: 0,
        }
      );

      let customRulesData = emptyCustomRulesUsage();
      try {
        const { jobs = [] } = await esClient.ml.getJobs();
        customRulesData = aggregateCustomRulesUsageFromJobs(jobs);
      } catch {
        // ML API may be unavailable; keep zeroes so alertRules data is still returned
      }

      return {
        alertRules: {
          [ML_ALERT_TYPES.ANOMALY_DETECTION]: {
            count_by_result_type: countByResultType,
            count_with_kql_filter: countWithKqlFilter,
          },
          [ML_ALERT_TYPES.AD_JOBS_HEALTH]: {
            count_by_check_type: resultsByCheckType,
          },
        },
        customRules: customRulesData,
      };
    },
  });

  usageCollection.registerCollector(collector);
}
