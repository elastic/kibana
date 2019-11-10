/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../server/lib/helpers/setup_request';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  ERROR_GROUP_ID
} from '../elasticsearch_fieldnames';
import { rangeFilter as getRangeFilter } from '../../server/lib/helpers/range_filter';
import {
  ErrorStatusGroup,
  ACTIVE_ERRORS,
  ALL_ERRORS,
  ARCHIVED_ERRORS
} from '../errors';

export function getErrorGroupsProjection({
  setup,
  serviceName,
  errorStatus = ACTIVE_ERRORS
}: {
  setup: Setup;
  serviceName: string;
  errorStatus?: ErrorStatusGroup;
}) {
  const { start, end, uiFiltersES, indices } = setup;

  const rangeFilter = { range: getRangeFilter(start, end) };

  let selectScript = {};

  switch (errorStatus) {
    default:
    case ALL_ERRORS:
      break;

    case ACTIVE_ERRORS:
      selectScript = {
        select: {
          bucket_selector: {
            buckets_path: {
              is_muted: 'is_muted.value',
              is_resolved: 'is_resolved.value'
            },
            script: 'params.is_muted == 0 && params.is_resolved == 0'
          }
        }
      };
      break;

    case ARCHIVED_ERRORS:
      selectScript = {
        select: {
          bucket_selector: {
            buckets_path: {
              is_muted: 'is_muted.value',
              is_resolved: 'is_resolved.value'
            },
            script: 'params.is_muted == 1 || params.is_resolved == 1'
          }
        }
      };
      break;
  }

  return {
    index: [indices['apm_oss.errorIndices'], indices.uiState],
    body: {
      query: {
        bool: {
          should: [
            {
              bool: {
                filter: [
                  { term: { [PROCESSOR_EVENT]: 'error' } },
                  { term: { [SERVICE_NAME]: serviceName } },
                  rangeFilter,
                  ...uiFiltersES
                ]
              }
            },
            {
              bool: {
                filter: [
                  { term: { [SERVICE_NAME]: serviceName } },
                  { exists: { field: 'ui.error' } }
                ]
              }
            }
          ],
          minimum_should_match: 1
        }
      },
      aggs: {
        error_groups: {
          terms: {
            field: ERROR_GROUP_ID
          },
          aggs: {
            muted: {
              filter: {
                term: {
                  'ui.error.muted': true
                }
              }
            },
            resolved_at: {
              max: {
                field: 'ui.error.resolved.timestamp'
              }
            },
            last_hit: {
              max: {
                field: '@timestamp'
              }
            },
            is_muted: {
              bucket_script: {
                buckets_path: {
                  muted: 'muted._count'
                },
                gap_policy: 'insert_zeros',
                script: 'params.muted > 0 ? 1 : 0'
              }
            },
            is_resolved: {
              bucket_script: {
                buckets_path: {
                  resolved_at: 'resolved_at.value',
                  last_hit: 'last_hit.value'
                },
                gap_policy: 'insert_zeros',
                script: 'params.resolved_at < params.last_hit ? 0 : 1'
              }
            },
            ...selectScript
          }
        }
      }
    }
  };
}
