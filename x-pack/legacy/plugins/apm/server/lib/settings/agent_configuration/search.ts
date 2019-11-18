/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ESSearchHit } from '../../../../typings/elasticsearch';
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
  const { internalClient, indices } = setup;

  // sorting order
  // 1. exact match: service.name AND service.environment (eg. opbeans-node / production)
  // 2. Partial match: service.name and no service.environment (eg. opbeans-node / All)
  // 3. Partial match: service.environment and no service.name (eg. All / production)
  // 4. Catch all: no service.name and no service.environment (eg. All / All)

  const environmentFilter = environment
    ? [{ term: { [SERVICE_ENVIRONMENT]: { value: environment } } }]
    : [];

  const params = {
    index: indices['apm_oss.apmAgentConfigurationIndex'],
    body: {
      query: {
        bool: {
          minimum_should_match: 2,
          should: [
            { term: { [SERVICE_NAME]: { value: serviceName } } },
            ...environmentFilter,
            { bool: { must_not: [{ exists: { field: SERVICE_NAME } }] } },
            { bool: { must_not: [{ exists: { field: SERVICE_ENVIRONMENT } }] } }
          ]
        }
      }
    }
  };

  const resp = await internalClient.search<AgentConfiguration, typeof params>(
    params
  );
  const { hits } = resp.hits;

  const exactMatch = hits.find(
    hit =>
      hit._source.service.name === serviceName &&
      hit._source.service.environment === environment
  );

  if (exactMatch) {
    return exactMatch;
  }

  const matchWithServiceName = hits.find(
    hit => hit._source.service.name === serviceName
  );

  if (matchWithServiceName) {
    return matchWithServiceName;
  }

  const matchWithEnvironment = hits.find(
    hit => hit._source.service.environment === environment
  );

  if (matchWithEnvironment) {
    return matchWithEnvironment;
  }

  return resp.hits.hits[0] as ESSearchHit<AgentConfiguration> | undefined;
}
