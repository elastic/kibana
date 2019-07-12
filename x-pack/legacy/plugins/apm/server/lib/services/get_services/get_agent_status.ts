/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams } from 'elasticsearch';
import { PROCESSOR_EVENT } from '../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../helpers/setup_request';

// Note: this logic is duplicated in tutorials/apm/envs/on_prem
export async function getAgentStatus(setup: Setup) {
  const { client, config } = setup;

  const params: SearchParams = {
    terminateAfter: 1,
    index: [
      config.get('apm_oss.errorIndices'),
      config.get('apm_oss.metricsIndices'),
      config.get('apm_oss.sourcemapIndices'),
      config.get('apm_oss.transactionIndices')
    ],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              terms: {
                [PROCESSOR_EVENT]: [
                  'error',
                  'metric',
                  'sourcemap',
                  'transaction'
                ]
              }
            }
          ]
        }
      }
    }
  };

  const resp = await client.search(params);
  const hasHistorialAgentData = resp.hits.total > 0;
  return hasHistorialAgentData;
}
