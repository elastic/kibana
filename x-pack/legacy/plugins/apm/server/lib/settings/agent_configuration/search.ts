/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from 'elasticsearch';
import { PromiseReturnType } from '../../../../typings/common';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT
} from '../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../helpers/setup_request';
import { AgentConfiguration } from './configuration_types';

export type SearchAgentConfigurationsAPIResponse = PromiseReturnType<
  typeof searchConfigurations
>;
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

  const filters: ESFilter[] = [{ term: { [SERVICE_NAME]: serviceName } }];

  if (environment) {
    filters.push({ term: { [SERVICE_ENVIRONMENT]: environment } });
  } else {
    filters.push({
      bool: { must_not: { exists: { field: SERVICE_ENVIRONMENT } } }
    });
  }

  const params = {
    index: config.get<string>('apm_oss.apmAgentConfigurationIndex'),
    body: {
      size: 1,
      query: {
        bool: { filter: filters }
      }
    }
  };

  const resp = await client.search<AgentConfiguration>(params);
  return resp.hits.hits[0];
}
