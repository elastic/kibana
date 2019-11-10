/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { idx } from '@kbn/elastic-idx';
import {
  ERROR_CULPRIT,
  ERROR_EXC_HANDLED,
  ERROR_EXC_MESSAGE,
  ERROR_GROUP_ID,
  ERROR_LOG_MESSAGE,
  PROCESSOR_EVENT
} from '../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../typings/common';
import { APMError } from '../../../typings/es_schemas/ui/APMError';
import { Setup } from '../helpers/setup_request';
import { getErrorGroupsProjection } from '../../../common/projections/errors';
import { mergeProjection } from '../../../common/projections/util/merge_projection';
import { SortOptions } from '../../../typings/elasticsearch/aggregations';
import { ErrorStatus, ErrorStatusGroup } from '../../../common/errors';

export type ErrorGroupListAPIResponse = PromiseReturnType<
  typeof getErrorGroups
>;

export async function getErrorGroups({
  serviceName,
  sortField = 'latestOccurrenceAt',
  sortDirection = 'desc',
  errorStatus,
  setup
}: {
  serviceName: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  errorStatus?: ErrorStatusGroup;
  setup: Setup;
}) {
  const { client } = setup;

  // sort buckets by last occurrence of error
  const sortByLatestOccurrence = sortField === 'latestOccurrenceAt';

  const projection = getErrorGroupsProjection({
    setup,
    serviceName,
    errorStatus
  });

  const order: SortOptions = sortByLatestOccurrence
    ? {
        last_hit: sortDirection
      }
    : { _count: sortDirection };

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      aggs: {
        error_groups: {
          terms: {
            ...projection.body.aggs.error_groups.terms,
            size: 500,
            order
          },
          aggs: {
            ...projection.body.aggs.error_groups.aggs,
            events_only: {
              filter: {
                term: {
                  [PROCESSOR_EVENT]: 'error'
                }
              },
              aggs: {
                sample: {
                  top_hits: {
                    _source: [
                      ERROR_LOG_MESSAGE,
                      ERROR_EXC_MESSAGE,
                      ERROR_EXC_HANDLED,
                      ERROR_CULPRIT,
                      ERROR_GROUP_ID,
                      '@timestamp'
                    ],
                    sort: [{ '@timestamp': 'desc' as const }],
                    size: 1
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  interface SampleError {
    '@timestamp': APMError['@timestamp'];
    error: {
      log?: {
        message: string;
      };
      exception?: Array<{
        handled?: boolean;
        message?: string;
      }>;
      culprit: APMError['error']['culprit'];
      grouping_key: APMError['error']['grouping_key'];
    };
  }

  const resp = await client.search<SampleError, typeof params>(params);

  const hits = (idx(resp, _ => _.aggregations.error_groups.buckets) || []).map(
    bucket => {
      const source = bucket.events_only.sample.hits.hits[0]._source;
      const message =
        idx(source, _ => _.error.log.message) ||
        idx(source, _ => _.error.exception[0].message);

      const muted = bucket.is_muted.value;
      const resolved = bucket.resolved_at.value !== null;
      const reoccuredAfterResolution =
        bucket.resolved_at.value !== null &&
        bucket.resolved_at.value < bucket.last_hit.value;

      let status = ErrorStatus.ACTIVE;

      if (muted) {
        status = ErrorStatus.MUTED;
      } else if (reoccuredAfterResolution) {
        status = ErrorStatus.REOCCURED;
      } else if (resolved) {
        status = ErrorStatus.RESOLVED;
      }

      return {
        status,
        muted,
        message,
        occurrenceCount: bucket.doc_count,
        culprit: source.error.culprit,
        groupId: source.error.grouping_key,
        latestOccurrenceAt: source['@timestamp'],
        handled: idx(source, _ => _.error.exception[0].handled)
      };
    }
  );

  return hits;
}
