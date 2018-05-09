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
