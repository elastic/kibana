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
import { format as formatUrl } from 'url';

import supertestAsPromised from 'supertest-as-promised';

export function KibanaSupertestProvider({ getService }, options) {
  const config = getService('config');
  const kibanaServerUrl = options ? formatUrl(options) : formatUrl(config.get('servers.kibana'));

  const kibanaServerCert = config
    .get('kbnTestServer.serverArgs')
    .filter(arg => arg.startsWith('--server.ssl.certificate'))
    .map(arg => arg.split('=').pop())
    .map(path => readFileSync(path))
    .shift();

  return kibanaServerCert
    ? supertestAsPromised.agent(kibanaServerUrl, { ca: kibanaServerCert })
    : supertestAsPromised(kibanaServerUrl);
}

export function KibanaSupertestWithoutAuthProvider({ getService }) {
  const config = getService('config');
  const kibanaServerConfig = config.get('servers.kibana');

  return supertestAsPromised(
    formatUrl({
      ...kibanaServerConfig,
      auth: false,
    })
  );
}

export function ElasticsearchSupertestProvider({ getService }) {
  const config = getService('config');
  const elasticSearchServerUrl = formatUrl(config.get('servers.elasticsearch'));
  return supertestAsPromised(elasticSearchServerUrl);
}
