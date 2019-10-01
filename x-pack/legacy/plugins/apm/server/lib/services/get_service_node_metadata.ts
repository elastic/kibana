/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { idx } from '@kbn/elastic-idx';
import { Setup } from '../helpers/setup_request';
import {
  HOST_NAME,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  CONTAINER_ID
} from '../../../common/elasticsearch_fieldnames';
import { NOT_AVAILABLE_LABEL } from '../../../common/i18n';

export async function getServiceNodeMetadata({
  serviceName,
  serviceNodeName,
  setup
}: {
  serviceName: string;
  serviceNodeName: string;
  setup: Setup;
}) {
  const { client, config } = setup;

  const query = {
    index: config.get<string>('apm_oss.metricsIndices'),
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [SERVICE_NODE_NAME]: serviceNodeName } }
          ]
        }
      },
      aggs: {
        host: {
          terms: {
            field: HOST_NAME,
            size: 1
          }
        },
        containerId: {
          terms: {
            field: CONTAINER_ID,
            size: 1
          }
        }
      }
    }
  };

  const response = await client.search(query);

  return {
    host:
      idx(response, _ => _.aggregations.host.buckets[0].key) ||
      NOT_AVAILABLE_LABEL,
    containerId:
      idx(response, _ => _.aggregations.containerId.buckets[0].key) ||
      NOT_AVAILABLE_LABEL
  };
}
