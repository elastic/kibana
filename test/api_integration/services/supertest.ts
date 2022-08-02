/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { systemIndicesSuperuser } from '@kbn/test';

import { format as formatUrl } from 'url';

import supertest from 'supertest';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

export function KibanaSupertestProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const kibanaServerUrl = formatUrl(config.get('servers.kibana'));
  return supertest(kibanaServerUrl);
}

export function ElasticsearchSupertestProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const esServerConfig = config.get('servers.elasticsearch');
  const elasticSearchServerUrl = formatUrl({
    ...esServerConfig,
    // Use system indices user so tests can write to system indices
    auth: `${systemIndicesSuperuser.username}:${systemIndicesSuperuser.password}`,
  });

  let agentOptions = {};
  if ('certificateAuthorities' in esServerConfig) {
    agentOptions = { ca: esServerConfig!.certificateAuthorities };
  }

  return supertest.agent(elasticSearchServerUrl, agentOptions);
}
