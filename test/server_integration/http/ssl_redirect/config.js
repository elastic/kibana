/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Url from 'url';
import { readFileSync } from 'fs';
import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';

import { createKibanaSupertestProvider } from '../../services';

export default async function ({ readConfigFile }) {
  const httpConfig = await readConfigFile(require.resolve('../../config'));
  const certificateAuthorities = [readFileSync(CA_CERT_PATH)];

  const redirectPort = httpConfig.get('servers.kibana.port') + 1234;

  return {
    testFiles: [require.resolve('.')],
    services: {
      ...httpConfig.get('services'),
      supertest: createKibanaSupertestProvider({
        certificateAuthorities,
        kibanaUrl: Url.format({
          ...httpConfig.get('servers.kibana'),
          port: redirectPort,
          // test with non ssl protocol
          protocol: 'http',
        }),
      }),
    },
    servers: {
      ...httpConfig.get('servers'),
      kibana: {
        ...httpConfig.get('servers.kibana'),
        // start the server with https
        protocol: 'https',
        certificateAuthorities,
      },
    },
    junit: {
      reportName: 'Http SSL Integration Tests',
    },
    esTestCluster: {
      ...httpConfig.get('esTestCluster'),
      serverArgs: ['xpack.security.enabled=false'],
    },
    kbnTestServer: {
      ...httpConfig.get('kbnTestServer'),
      serverArgs: [
        ...httpConfig.get('kbnTestServer.serverArgs'),
        '--server.ssl.enabled=true',
        `--server.ssl.key=${KBN_KEY_PATH}`,
        `--server.ssl.certificate=${KBN_CERT_PATH}`,
        `--server.ssl.redirectHttpFromPort=${redirectPort}`,
      ],
    },
  };
}
