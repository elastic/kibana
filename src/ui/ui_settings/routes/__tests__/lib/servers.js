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

import { createEsTestCluster } from '@kbn/test';
import { createToolingLog } from '@kbn/dev-utils';
import * as kbnTestServer from '../../../../../test_utils/kbn_server';

let kbnServer;
let services;
let es;

export async function startServers() {
  const log = createToolingLog('debug');
  log.pipe(process.stdout);
  log.indent(6);

  log.info('starting elasticsearch');
  log.indent(4);

  es = createEsTestCluster({ log });
  this.timeout(es.getStartTimeout());

  log.indent(-4);
  await es.start();

  kbnServer = kbnTestServer.createServerWithCorePlugins();
  await kbnServer.ready();
  await kbnServer.server.plugins.elasticsearch.waitUntilReady();
}

export function getServices() {
  if (services) {
    return services;
  }

  const callCluster = es.getCallCluster();

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
  };

  return services;
}

export async function stopServers() {
  services = null;

  if (kbnServer) {
    await kbnServer.close();
    kbnServer = null;
  }

  if (es) {
    await es.cleanup();
    es = null;
  }
}
