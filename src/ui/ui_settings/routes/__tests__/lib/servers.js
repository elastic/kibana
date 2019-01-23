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

import { startTestServers } from '../../../../../test_utils/kbn_server';

let kbnServer;
let services;
let servers;

export async function startServers() {
  servers = await startTestServers({
    adjustTimeout: (t) => this.timeout(t),
    settings: {
      kbn: {
        uiSettings: {
          overrides: {
            foo: 'bar',
          }
        },
      },
    },
  });
  kbnServer = servers.kbnServer;
}

async function deleteKibanaIndex(callCluster) {
  const kibanaIndices = await callCluster('cat.indices', { index: '.kibana*', format: 'json' });
  const indexNames = kibanaIndices.map(x => x.index);
  if (!indexNames.length) {
    return;
  }
  await callCluster('indices.putSettings', {
    index: indexNames,
    body: { index: { blocks: { read_only: false } } },
  });
  await callCluster('indices.delete', { index: indexNames });
  return indexNames;
}

export function getServices() {
  if (services) {
    return services;
  }

  const callCluster = servers.es.getCallCluster();

  const savedObjects = kbnServer.server.savedObjects;
  const savedObjectsClient = savedObjects.getScopedSavedObjectsClient();

  const uiSettings = kbnServer.server.uiSettingsServiceFactory({
    savedObjectsClient,
  });

  services = {
    kbnServer,
    callCluster,
    savedObjectsClient,
    uiSettings,
    deleteKibanaIndex,
  };

  return services;
}

export async function stopServers() {
  services = null;
  kbnServer = null;
  if (servers) {
    await servers.stop();
  }
}
