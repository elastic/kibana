/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from 'test/functional/ftr_provider_context';
import { format as formatUrl } from 'url';

import supertestAsPromised from 'supertest-as-promised';

export function KibanaSupertestProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const kibanaServerUrl = formatUrl(config.get('servers.kibana'));
  return supertestAsPromised(kibanaServerUrl);
}

export function ElasticsearchSupertestProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const esServerConfig = config.get('servers.elasticsearch');
  const elasticSearchServerUrl = formatUrl(esServerConfig);

  let agentOptions = {};
  if ('certificateAuthorities' in esServerConfig) {
    agentOptions = { ca: esServerConfig!.certificateAuthorities };
  }

  // @ts-ignore - supertestAsPromised doesn't like the agentOptions, but still passes it correctly to supertest
  return supertestAsPromised.agent(elasticSearchServerUrl, agentOptions);
}
