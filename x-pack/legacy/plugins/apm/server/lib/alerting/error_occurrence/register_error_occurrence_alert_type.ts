/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';
import { InternalCoreSetup } from 'src/core/server';
import { idx } from '@kbn/elastic-idx';
import { ESSearchResponse } from '../../../../typings/elasticsearch';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { APMError } from '../../../../typings/es_schemas/ui/APMError';
import { ERROR_OCCURRENCE_ALERT_TYPE_ID } from '../../../../common/alerting/constants';
import {
  SERVICE_NAME,
  PROCESSOR_EVENT,
  ERROR_LOG_MESSAGE,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_HANDLED,
  ERROR_CULPRIT,
  ERROR_GROUP_ID
} from '../../../../common/elasticsearch_fieldnames';

const paramsSchema = schema.object({
  threshold: schema.number({ min: 1 }),
  interval: schema.string(),
  serviceName: schema.string()
});

const registerErrorOccurrenceAlertType = async (core: InternalCoreSetup) => {
  const { alerting, elasticsearch } = core.http.server.plugins;

  if (!alerting) {
    throw new Error(
      'Cannot register error occurrence alert type. Both the actions and alerting plugins need to be enabled'
    );
  }

  alerting.setup.registerType({
    id: ERROR_OCCURRENCE_ALERT_TYPE_ID,
    name: 'Error occurrences',
    actionGroups: ['default'],
    validate: {
      params: paramsSchema
    },
    async executor({ params, services }) {
      const { threshold, interval, serviceName } = params as TypeOf<
        typeof paramsSchema
      >;

      const request = {
        body: {
          query: {
            bool: {
              filter: [
                { term: { [SERVICE_NAME]: serviceName } },
                { term: { [PROCESSOR_EVENT]: 'error' } },
                {
                  range: {
                    '@timestamp': {
                      gte: `now-${interval}`
                    }
                  }
                }
              ]
            }
          },
          aggs: {
            error_groups: {
              terms: {
                min_doc_count: threshold,
                field: ERROR_GROUP_ID,
                size: 10,
                order: {
                  _count: 'desc' as const
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
                    sort: [
                      {
                        '@timestamp': 'desc' as const
                      }
                    ],
                    size: 1
                  }
                }
              }
            }
          }
        }
      };

      const { callWithInternalUser } = elasticsearch.getCluster('admin');

      const response: ESSearchResponse<
        unknown,
        typeof request
      > = await callWithInternalUser('search', request);
      const { aggregations } = response;

      if (!aggregations) {
        throw new Error(
          'No aggregations were returned for search. This happens when no matching indices are found.'
        );
      }

      const infringingErrorGroups = aggregations.error_groups.buckets;

      const shouldAlert = infringingErrorGroups.length > 0;

      if (shouldAlert) {
        const alertInstance = services.alertInstanceFactory('');

        const sampleError = infringingErrorGroups[0].sample.hits.hits[0]
          ._source as APMError;

        alertInstance.scheduleActions('default', {
          errorGroupsBuckets: infringingErrorGroups,
          errorLogMessage:
            idx(sampleError, _ => _.error.log.message) ||
            idx(sampleError, _ => _.error.exception[0].message),
          errorCulprit:
            idx(sampleError, _ => _.error.culprit) || NOT_AVAILABLE_LABEL,
          docCount: infringingErrorGroups[0].doc_count
        });
      }
    }
  });
};

export { registerErrorOccurrenceAlertType };
