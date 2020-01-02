/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { uniq, take, sortBy } from 'lodash';
import { PromiseReturnType } from '../../../typings/common';
import { rangeFilter } from '../helpers/range_filter';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../helpers/setup_request';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  DESTINATION_ADDRESS,
  PROCESSOR_EVENT,
  PARENT_ID,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
  SPAN_TYPE,
  SPAN_SUBTYPE,
  TRACE_ID,
  TRANSACTION_SAMPLED
} from '../../../common/elasticsearch_fieldnames';
import { ESFilter } from '../../../typings/elasticsearch';
import { getServiceMapFromTraceIds } from './get_service_map_from_trace_ids';

export interface IEnvOptions {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  serviceName?: string;
  environment?: string;
  after?: string;
}

const MAX_TRACES_TO_INSPECT = 1000;

export type ServiceMapAPIResponse = PromiseReturnType<typeof getServiceMap>;
export async function getServiceMap({
  setup,
  serviceName,
  environment,
  after
}: IEnvOptions) {
  const isTop = !after;
  const isAll = !serviceName;

  const { indices, start, end, client, uiFiltersES } = setup;

  let sampleIndices = [indices['apm_oss.spanIndices']];

  let processorEvent = 'span';

  const rangeQuery = { range: rangeFilter(start, end) };

  if (isTop) {
    sampleIndices = [indices['apm_oss.transactionIndices']];
    processorEvent = 'transaction';
  }

  const query = {
    bool: {
      filter: [
        { term: { [PROCESSOR_EVENT]: processorEvent } },
        rangeQuery,
        ...uiFiltersES
      ] as ESFilter[]
    }
  } as { bool: { filter: ESFilter[]; must_not?: ESFilter[] | ESFilter } };

  if (serviceName) {
    query.bool.filter.push({ term: { [SERVICE_NAME]: serviceName } });
  }

  if (environment) {
    query.bool.filter.push({ term: { [SERVICE_ENVIRONMENT]: environment } });
  }

  if (isTop && isAll) {
    query.bool.must_not = { exists: { field: PARENT_ID } };
  }

  if (processorEvent === 'transaction') {
    query.bool.filter.push({ term: { [TRANSACTION_SAMPLED]: true } });
  }

  const afterObj =
    after && after !== 'top'
      ? { after: JSON.parse(Buffer.from(after, 'base64').toString()) }
      : {};

  const params = {
    index: sampleIndices,
    body: {
      size: 0,
      query,
      aggs: {
        connections: {
          composite: {
            size: 1000,
            ...afterObj,
            sources: [
              { [SERVICE_NAME]: { terms: { field: SERVICE_NAME } } },
              {
                [SERVICE_ENVIRONMENT]: {
                  terms: { field: SERVICE_ENVIRONMENT, missing_bucket: true }
                }
              },
              {
                [TRANSACTION_TYPE]: {
                  terms: { field: TRANSACTION_TYPE, missing_bucket: true }
                }
              },
              {
                [TRANSACTION_NAME]: {
                  terms: { field: TRANSACTION_NAME, missing_bucket: true }
                }
              },
              {
                [SPAN_TYPE]: {
                  terms: { field: SPAN_TYPE, missing_bucket: true }
                }
              },
              {
                [SPAN_SUBTYPE]: {
                  terms: { field: SPAN_SUBTYPE, missing_bucket: true }
                }
              },
              {
                [DESTINATION_ADDRESS]: {
                  terms: { field: DESTINATION_ADDRESS, missing_bucket: true }
                }
              }
            ]
          },
          aggs: {
            trace_id_samples: {
              diversified_sampler: {
                shard_size: 20,
                ...(processorEvent === 'transaction'
                  ? { field: TRACE_ID }
                  : {
                      script: {
                        lang: 'painless',
                        source: `(int)doc['span.duration.us'].value/100000`
                      }
                    })
              },
              aggs: {
                sample_documents: {
                  top_hits: {
                    size: 20,
                    _source: ['trace.id']
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  const tracesSampleResponse = await client.search<
    { trace: { id: string } },
    typeof params
  >(params);

  let nextAfter: string | undefined;

  const receivedAfterKey =
    tracesSampleResponse.aggregations?.connections.after_key;

  if (!after) {
    nextAfter = 'top';
  } else if (receivedAfterKey) {
    nextAfter = Buffer.from(JSON.stringify(receivedAfterKey)).toString(
      'base64'
    );
  }

  // make sure at least one trace per composite/connection bucket
  // is queried
  const traceIdsWithPriority =
    tracesSampleResponse.aggregations?.connections.buckets.flatMap(bucket =>
      bucket.trace_id_samples.sample_documents.hits.hits.map((hit, index) => ({
        traceId: hit._source.trace.id,
        priority: index
      }))
    ) || [];

  const traceIds = take(
    uniq(
      sortBy(traceIdsWithPriority, 'priority').map(({ traceId }) => traceId)
    ),
    MAX_TRACES_TO_INSPECT
  );

  const serviceMapData = traceIds.length
    ? await getServiceMapFromTraceIds({
        setup,
        serviceName,
        environment,
        traceIds
      })
    : { connections: [], destinationMap: {} };

  return {
    after: nextAfter,
    ...serviceMapData
  };
}
