/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestServers, createRootWithCorePlugins } from '@kbn/core-test-helpers-kbn-server';
import { waitForAlertingVTwoSetup } from './helpers/wait';

export async function setupTestServers(settings = {}) {
  const { startES } = createTestServers({
    adjustTimeout: (t) => jest.setTimeout(t),
    settings: {
      es: {
        license: 'trial',
        esArgs: ['xpack.ml.enabled=false', 'xpack.watcher.enabled=false'],
      },
    },
  });

  const esServer = await startES();

  const startKibana = async () => {
    const root = createRootWithCorePlugins(
      {
        xpack: {
          alerting_v2: { enabled: true },
          reporting: { enabled: false },
          canvas: { enabled: false },
          uptime: { enabled: false },
          fleet: { enabled: false },
          task_manager: { unsafe: { exclude_task_types: ['alerting_v2:dispatcher'] } },
        },
        ...settings,
      },
      { oss: false }
    );

    await root.preboot();
    const coreSetup = await root.setup();
    const coreStart = await root.start();

    return {
      root,
      coreSetup,
      coreStart,
      stop: async () => await root.shutdown(),
    };
  };

  const kbnServer = await startKibana();

  await waitForAlertingVTwoSetup(kbnServer.root);

  return {
    esServer,
    kibanaServer: kbnServer,
  };
}
