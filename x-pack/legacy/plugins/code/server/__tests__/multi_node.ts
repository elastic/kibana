/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import getPort from 'get-port';
import { resolve } from 'path';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Root } from 'src/core/server/root';

import {
  createRootWithCorePlugins,
  request,
  createTestServers,
} from '../../../../../../src/test_utils/kbn_server';

const xpackOption = {
  upgrade_assistant: {
    enabled: false,
  },
  security: {
    enabled: false,
  },
  ccr: {
    enabled: false,
  },
  monitoring: {
    enabled: false,
  },
  beats: {
    enabled: false,
  },
  ilm: {
    enabled: false,
  },
  logstash: {
    enabled: false,
  },
  rollup: {
    enabled: false,
  },
  watcher: {
    enabled: false,
  },
  remote_clusters: {
    enabled: false,
  },
  reporting: {
    enabled: false,
  },
  task_manager: {
    enabled: false,
  },
  maps: {
    enabled: false,
  },
  oss_telemetry: {
    enabled: false,
  },
  xpack_main: {
    enabled: true,
  },
};

// FLAKY: https://github.com/elastic/kibana/issues/43960
describe.skip('code in multiple nodes', () => {
  const codeNodeUuid = 'c4add484-0cba-4e05-86fe-4baa112d9e53';
  const nonodeNodeUuid = '22b75e04-0e50-4647-9643-6b1b1d88beaf';
  let codePort: number;
  let nonCodePort: number;
  let nonCodeNode: Root;

  let kbnRootServer: any;
  let kbn: any;
  let esServer: any;
  const pluginPaths = resolve(__dirname, '../../../../../');

  async function startServers() {
    const servers = createTestServers({
      adjustTimeout: t => {
        // @ts-ignore
        this.timeout(t);
      },
      settings: {
        kbn: {
          server: {
            uuid: codeNodeUuid,
            port: codePort,
          },
          plugins: { paths: [pluginPaths] },
          xpack: { ...xpackOption, code: { codeNodeUrl: `http://localhost:${codePort}` } },
          logging: { silent: false },
        },
      },
    });

    esServer = await servers.startES();
    kbn = await servers.startKibana();
    kbnRootServer = kbn.root;
  }

  async function startNonCodeNodeKibana() {
    const setting = {
      server: {
        port: nonCodePort,
        uuid: nonodeNodeUuid,
      },
      plugins: { paths: [pluginPaths] },
      xpack: {
        ...xpackOption,
        code: { codeNodeUrl: `http://localhost:${codePort}` },
      },
      logging: { silent: true },
    };
    nonCodeNode = createRootWithCorePlugins(setting);
    await nonCodeNode.setup();
    await nonCodeNode.start();
  }

  // @ts-ignore
  before(async function() {
    nonCodePort = await getPort();
    codePort = await getPort();

    // @ts-ignore
    await startServers.bind(this)();
    await startNonCodeNodeKibana();
  });

  // @ts-ignore
  after(async function() {
    await nonCodeNode.shutdown();
    await kbn.stop();
    await esServer.stop();
  });

  function delay(ms: number) {
    return new Promise(resolve1 => {
      setTimeout(resolve1, ms);
    });
  }

  it('Code node setup should be ok', async () => {
    await delay(6000);
    await request.get(kbnRootServer, '/api/code/setup').expect(200);
    // @ts-ignore
  }).timeout(20000);

  it('Non-code node setup should be ok', async () => {
    await delay(1000);
    await request.get(nonCodeNode, '/api/code/setup').expect(200);
    // @ts-ignore
  }).timeout(5000);

  it('Non-code node setup should fail if code node is shutdown', async () => {
    await kbn.stop();
    await request.get(nonCodeNode, '/api/code/setup').expect(502);

    // TODO restart root clearly is hard to do during platform migration
    // A clear way is to createEsCluster individually and not reuse the
    // same root

    // @ts-ignore
  }).timeout(20000);
});
