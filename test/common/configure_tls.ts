/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readFileSync } from 'fs';
import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { addOrReplaceKbnServerArg } from './configure_http2';

type ConfigType = Record<string, any>;

export const configureTLS = (config: ConfigType): ConfigType => {
  // Add env flag to avoid terminating on NODE_TLS_REJECT_UNAUTHORIZED warning
  process.env.IS_FTR_RUNNER = 'true';

  // tell native node agents to trust unsafe certificates
  // this is ugly, but unfortunately required, as some libraries (such as supertest)
  // have no real alternatives to accept self-signed certs
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  // tell webdriver browser to accept self-signed certificates
  config.browser = { ...(config.browser ?? {}), acceptInsecureCerts: true };

  // change the configured kibana server to run on https with the dev CA
  config.servers.kibana = {
    ...config.servers.kibana,
    protocol: 'https',
    certificateAuthorities: [readFileSync(CA_CERT_PATH, 'utf-8')],
  };

  const serverArgs = config.kbnTestServer.serverArgs;

  // enable and configure TLS on the kibana server
  addOrReplaceKbnServerArg(serverArgs, 'server.ssl.enabled', () => 'true');
  addOrReplaceKbnServerArg(serverArgs, 'server.ssl.key', () => KBN_KEY_PATH);
  addOrReplaceKbnServerArg(serverArgs, 'server.ssl.certificate', () => KBN_CERT_PATH);
  addOrReplaceKbnServerArg(serverArgs, 'server.ssl.certificateAuthorities', () => CA_CERT_PATH);
  // replace the newsfeed test plugin url to use https
  addOrReplaceKbnServerArg(serverArgs, 'newsfeed.service.urlRoot', (oldValue) => {
    if (!oldValue || !oldValue.includes(config.servers.kibana.hostname)) {
      return undefined;
    }
    return oldValue.replaceAll('http', 'https');
  });

  return config;
};
