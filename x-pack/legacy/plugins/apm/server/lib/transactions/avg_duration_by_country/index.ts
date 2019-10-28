/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CLIENT_GEO_COUNTRY_ISO_CODE,
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_TYPE
} from '../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../helpers/setup_request';
import { rangeFilter } from '../../helpers/range_filter';

export async function getTransactionAvgDurationByCountry({
  setup,
  serviceName
}: {
  setup: Setup;
  serviceName: string;
}) {
  const { uiFiltersES, client, start, end, indices } = setup;
  const params = {
    index: indices['apm_oss.transactionIndices'],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [PROCESSOR_EVENT]: 'transaction' } },
            { term: { [TRANSACTION_TYPE]: 'page-load' } },
            { exists: { field: CLIENT_GEO_COUNTRY_ISO_CODE } },
            { range: rangeFilter(start, end) },
            ...uiFiltersES
          ]
        }
      },
      aggs: {
        country_code: {
          terms: {
            field: CLIENT_GEO_COUNTRY_ISO_CODE,
            size: 500
          },
          aggs: {
            avg_duration: {
              avg: { field: TRANSACTION_DURATION }
            }
          }
        }
      }
    }
  };

  const resp = await client.search(params);

  if (!resp.aggregations) {
    return [];
  }

  const buckets = resp.aggregations.country_code.buckets;
  const avgDurationsByCountry = buckets.map(
    ({ key, doc_count, avg_duration: { value } }) => ({
      key: key as string,
      docCount: doc_count,
      value: value === null ? 0 : value
    })
  );

  return avgDurationsByCountry;
}
