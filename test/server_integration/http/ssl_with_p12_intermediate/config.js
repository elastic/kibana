/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { readFileSync } from 'fs';
import { CA1_CERT_PATH, CA2_CERT_PATH, EE_P12_PATH, EE_P12_PASSWORD } from '../../__fixtures__';
import { createKibanaSupertestProvider } from '../../services';

export default async function({ readConfigFile }) {
  const httpConfig = await readConfigFile(require.resolve('../../config'));

  return {
    testFiles: [require.resolve('./')],
    services: {
      ...httpConfig.get('services'),
      supertest: createKibanaSupertestProvider({
        certificateAuthorities: [readFileSync(CA1_CERT_PATH), readFileSync(CA2_CERT_PATH)],
      }),
    },
    servers: {
      ...httpConfig.get('servers'),
      kibana: {
        ...httpConfig.get('servers.kibana'),
        protocol: 'https',
      },
    },
    junit: {
      reportName: 'Http SSL Integration Tests',
    },
    esTestCluster: httpConfig.get('esTestCluster'),
    kbnTestServer: {
      ...httpConfig.get('kbnTestServer'),
      serverArgs: [
        ...httpConfig.get('kbnTestServer.serverArgs'),
        '--server.ssl.enabled=true',
        `--server.ssl.keystore.path=${EE_P12_PATH}`,
        `--server.ssl.keystore.password=${EE_P12_PASSWORD}`,
      ],
    },
  };
}
