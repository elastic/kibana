/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { idx } from '@kbn/elastic-idx';
import {
  ERROR_GROUP_ID,
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_SAMPLED
} from '../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../typings/common';
import { APMError } from '../../../typings/es_schemas/ui/APMError';
import { rangeFilter } from '../helpers/range_filter';
import { Setup } from '../helpers/setup_request';
import { getTransaction } from '../transactions/get_transaction';

export type ErrorGroupAPIResponse = PromiseReturnType<typeof getErrorGroup>;

// TODO: rename from "getErrorGroup"  to "getErrorGroupSample" (since a single error is returned, not an errorGroup)
export async function getErrorGroup({
  serviceName,
  groupId,
  setup
}: {
  serviceName: string;
  groupId: string;
  setup: Setup;
}) {
  const { start, end, uiFiltersES, client, config } = setup;

  const params = {
    index: config.get<string>('apm_oss.errorIndices'),
    body: {
      size: 1,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [PROCESSOR_EVENT]: 'error' } },
            { term: { [ERROR_GROUP_ID]: groupId } },
            { range: rangeFilter(start, end) },
            ...uiFiltersES
          ],
          should: [{ term: { [TRANSACTION_SAMPLED]: true } }]
        }
      },
      sort: [
        { _score: 'desc' }, // sort by _score first to ensure that errors with transaction.sampled:true ends up on top
        { '@timestamp': { order: 'desc' } } // sort by timestamp to get the most recent error
      ]
    }
  };

  const resp = await client.search<APMError>(params);
  const error = idx(resp, _ => _.hits.hits[0]._source);
  const transactionId = idx(error, _ => _.transaction.id);
  const traceId = idx(error, _ => _.trace.id);

  let transaction;
  if (transactionId && traceId) {
    transaction = await getTransaction(transactionId, traceId, setup);
  }

  return {
    transaction,
    error,
    occurrencesCount: resp.hits.total
  };
}
