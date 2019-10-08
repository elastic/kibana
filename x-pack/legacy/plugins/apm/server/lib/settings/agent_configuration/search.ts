/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESSearchHit } from 'elasticsearch';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT
} from '../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../helpers/setup_request';
import { AgentConfiguration } from './configuration_types';

export async function searchConfigurations({
  serviceName,
  environment,
  setup
}: {
  serviceName: string;
  environment?: string;
  setup: Setup;
}) {
  const { client, config } = setup;

  const environmentFilter = environment
    ? [{ term: { [SERVICE_ENVIRONMENT]: { boost: 2, value: environment } } }]
    : [];

  const params = {
    index: config.get<string>('apm_oss.apmAgentConfigurationIndex'),
    body: {
      size: 1,
      query: {
        bool: {
          minimum_should_match: 2,
          should: [
            { term: { [SERVICE_NAME]: { boost: 3, value: serviceName } } },
            ...environmentFilter,
            { bool: { must_not: [{ exists: { field: SERVICE_NAME } }] } },
            { bool: { must_not: [{ exists: { field: SERVICE_ENVIRONMENT } }] } }
          ]
        }
      }
    }
  };

  const resp = await client.search<AgentConfiguration>(params);
  return resp.hits.hits[0] as ESSearchHit<AgentConfiguration> | undefined;
}
