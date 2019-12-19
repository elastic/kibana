/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isNumber } from 'lodash';
import { Annotation, AnnotationType } from '../../../../common/annotations';
import { ESFilter } from '../../../../typings/elasticsearch';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  PROCESSOR_EVENT
} from '../../../../common/elasticsearch_fieldnames';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { rangeFilter } from '../../helpers/range_filter';
import { SERVICE_VERSION } from '../../../../common/elasticsearch_fieldnames';

export async function getServiceAnnotations({
  setup,
  serviceName,
  environment
}: {
  serviceName: string;
  environment?: string;
  setup: Setup & SetupTimeRange;
}) {
  const { start, end, client, indices } = setup;

  const filter: ESFilter[] = [
    { term: { [PROCESSOR_EVENT]: 'transaction' } },
    { range: rangeFilter(start, end) },
    { term: { [SERVICE_NAME]: serviceName } }
  ];

  if (environment) {
    filter.push({ term: { [SERVICE_ENVIRONMENT]: environment } });
  }

  const versions =
    (
      await client.search({
        index: indices['apm_oss.transactionIndices'],
        body: {
          size: 0,
          track_total_hits: false,
          query: {
            bool: {
              filter
            }
          },
          aggs: {
            versions: {
              terms: {
                field: SERVICE_VERSION
              }
            }
          }
        }
      })
    ).aggregations?.versions.buckets.map(bucket => bucket.key) ?? [];

  if (versions.length > 1) {
    const annotations = await Promise.all(
      versions.map(async version => {
        const response = await client.search({
          index: indices['apm_oss.transactionIndices'],
          body: {
            size: 0,
            query: {
              bool: {
                filter: filter
                  .filter(esFilter => !Object.keys(esFilter).includes('range'))
                  .concat({
                    term: {
                      [SERVICE_VERSION]: version
                    }
                  })
              }
            },
            aggs: {
              first_seen: {
                min: {
                  field: '@timestamp'
                }
              }
            },
            track_total_hits: false
          }
        });

        const firstSeen = response.aggregations?.first_seen.value;

        if (!isNumber(firstSeen)) {
          throw new Error(
            'First seen for version was unexpectedly undefined or null.'
          );
        }

        if (firstSeen < start || firstSeen > end) {
          return null;
        }

        return {
          type: AnnotationType.VERSION,
          id: version,
          time: firstSeen,
          text: version
        };
      })
    );
    return { annotations: annotations.filter(Boolean) as Annotation[] };
  }
  return { annotations: [] };
}
