/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import { SLO } from '../../../domain/models';
import {
  getSLOSummaryPipelineId,
  getSLOSummaryTransformId,
  SLO_DESTINATION_INDEX_PATTERN,
  SLO_RESOURCES_VERSION,
  SLO_SUMMARY_DESTINATION_INDEX_NAME,
} from '../../../../common/constants';
import { getGroupBy } from './common';

export function generateSummaryTransformForOccurrences(slo: SLO): TransformPutTransformRequest {
  return {
    transform_id: getSLOSummaryTransformId(slo.id, slo.revision),
    dest: {
      pipeline: getSLOSummaryPipelineId(slo.id, slo.revision),
      index: SLO_SUMMARY_DESTINATION_INDEX_NAME,
    },
    source: {
      index: SLO_DESTINATION_INDEX_PATTERN,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: `now-${slo.timeWindow.duration.format()}/m`,
                  lte: 'now/m',
                },
              },
            },
            {
              term: {
                'slo.id': slo.id,
              },
            },
            {
              term: {
                'slo.revision': slo.revision,
              },
            },
          ],
        },
      },
    },
    pivot: {
      group_by: getGroupBy(slo),
      aggregations: {
        goodEvents: {
          sum: {
            field: 'slo.numerator',
          },
        },
        totalEvents: {
          sum: {
            field: 'slo.denominator',
          },
        },
        sliValue: {
          bucket_script: {
            buckets_path: {
              goodEvents: 'goodEvents',
              totalEvents: 'totalEvents',
            },
            script:
              'if (params.totalEvents == 0) { return -1 } else if (params.goodEvents >= params.totalEvents) { return 1 } else { return params.goodEvents / params.totalEvents }',
          },
        },
        errorBudgetInitial: {
          bucket_script: {
            buckets_path: {},
            script: `1 - ${slo.objective.target}`,
          },
        },
        errorBudgetConsumed: {
          bucket_script: {
            buckets_path: {
              sliValue: 'sliValue',
              errorBudgetInitial: 'errorBudgetInitial',
            },
            script:
              'if (params.sliValue == -1) { return 0 } else { return (1 - params.sliValue) / params.errorBudgetInitial }',
          },
        },
        errorBudgetRemaining: {
          bucket_script: {
            buckets_path: {
              errorBudgetConsumed: 'errorBudgetConsumed',
            },
            script: '1 - params.errorBudgetConsumed',
          },
        },
        statusCode: {
          bucket_script: {
            buckets_path: {
              sliValue: 'sliValue',
              errorBudgetRemaining: 'errorBudgetRemaining',
            },
            script: {
              source: `if (params.sliValue == -1) { return 0 } else if (params.sliValue >= ${slo.objective.target}) { return 4 } else if (params.errorBudgetRemaining > 0) { return 2 } else { return 1 }`,
            },
          },
        },
        latestSliTimestamp: {
          max: {
            field: '@timestamp',
          },
        },
      },
    },
    description: `Summarise the rollup data of SLO: ${slo.name} [id: ${slo.id}, revision: ${slo.revision}].`,
    frequency: '1m',
    sync: {
      time: {
        field: 'event.ingested',
        delay: '65s',
      },
    },
    settings: {
      deduce_mappings: false,
      unattended: true,
    },
    defer_validation: true,
    _meta: {
      version: SLO_RESOURCES_VERSION,
      managed: true,
      managed_by: 'observability',
    },
  };
}
