/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams } from 'elasticsearch';
import { idx } from '@kbn/elastic-idx';
import {
  PROCESSOR_EVENT,
  TRACE_ID,
  PARENT_ID
} from '../../../common/elasticsearch_fieldnames';
import { Transaction } from '../../../typings/es_schemas/ui/Transaction';
import { rangeFilter } from '../helpers/range_filter';
import { Setup } from '../helpers/setup_request';

export async function getTraceRoot(traceId: string, setup: Setup) {
  const { start, end, client, config } = setup;

  const params: SearchParams = {
    index: [
      config.get('apm_oss.spanIndices'),
      config.get('apm_oss.transactionIndices')
    ],
    body: {
      size: 1,
      query: {
        bool: {
          filter: [
            { term: { [TRACE_ID]: traceId } },
            { terms: { [PROCESSOR_EVENT]: ['transaction'] } },
            { range: rangeFilter(start, end) }
          ],
          must_not: {
            exists: { field: PARENT_ID }
          }
        }
      }
    }
  };

  const resp = await client.search<Transaction>(params);
  const root: Transaction | undefined = idx(resp, _ => _.hits.hits[0]._source);

  return root;
}
