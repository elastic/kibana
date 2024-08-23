/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { format as formatUrl } from 'url';

import supertest, { AgentOptions } from 'supertest';
import { FtrProviderContext } from '../ftr_provider_context';

export function KibanaSupertestProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const kibanaServerConfig = config.get('servers.kibana');
  const kibanaServerUrl = formatUrl(kibanaServerConfig);

  const options: AgentOptions = {};
  if (kibanaServerConfig.certificateAuthorities) {
    options.ca = kibanaServerConfig.certificateAuthorities;
    options.rejectUnauthorized = false;
  }

  const serverArgs = config.get('kbnTestServer.serverArgs', []) as string[];
  const http2Enabled = serverArgs.includes('--server.protocol=http2');
  if (http2Enabled) {
    options.http2 = true;
  }

  return supertest(kibanaServerUrl, options);
}
