import { createEsTestCluster } from '../../../../../test_utils/es';
import * as kbnTestServer from '../../../../../test_utils/kbn_server';

let kbnServer;
let services;
const es = createEsTestCluster({
  name: 'ui_settings/routes'
});

export async function startServers() {
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
    uiSettings
  };

  return services;
}

export async function stopServers() {
  services = null;

  if (kbnServer) {
    await kbnServer.close();
    kbnServer = null;
  }

  await es.stop();
}
