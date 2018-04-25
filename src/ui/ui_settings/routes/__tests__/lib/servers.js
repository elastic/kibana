import { createEsTestCluster } from '@kbn/test';
import * as kbnTestServer from '../../../../../test_utils/kbn_server';

let kbnServer;
let services;
let es;

export async function startServers() {
  es = createEsTestCluster();
  this.timeout(es.getStartTimeout());

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

  const savedObjectsClient = kbnServer.server.savedObjectsClientFactory({
    callCluster,
  });

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
