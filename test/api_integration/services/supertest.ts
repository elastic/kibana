/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from 'test/functional/ftr_provider_context';
import { readFileSync } from 'fs';
import { format as formatUrl } from 'url';

import supertestAsPromised from 'supertest-as-promised';

export function KibanaSupertestProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const kibanaServerUrl = formatUrl(config.get('servers.kibana'));
  return supertestAsPromised(kibanaServerUrl);
}

export function ElasticsearchSupertestProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const elasticSearchServerUrl = formatUrl(config.get('servers.elasticsearch'));

  let agentOptions = {};
  const kbnServerArgs: string[] = config.get('kbnTestServer.serverArgs');
  const esCa = kbnServerArgs
    .find((arg) => arg.startsWith('--elasticsearch.ssl.certificateAuthorities'))
    ?.split('=')[1];
  if (esCa) {
    agentOptions = { ca: readFileSync(esCa) };
  }

  // @ts-ignore - supertestAsPromised doesn't like the agentOptions, but still passes it correctly to supertest
  return supertestAsPromised.agent(elasticSearchServerUrl, agentOptions);
}
