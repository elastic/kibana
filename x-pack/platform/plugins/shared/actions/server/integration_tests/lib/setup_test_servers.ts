/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createTestServers,
  createRootWithCorePlugins,
  getSupertest,
} from '@kbn/core-test-helpers-kbn-server';

// `root.start()` resolves before the licensing plugin's first license fetch does, and until
// that fetch completes the security auth gate rejects every authenticated request with a
// 503 ("License information could not be obtained from Elasticsearch"). Poll a cheap read
// through that gate until it stops answering 503. The route is `access: 'internal'` and the
// test root enables `server.restrictInternalApis`, so the internal-origin header is needed
// for the request to get past the post-auth restriction (a 400 otherwise) once the gate opens.
async function waitForLicense(root: ReturnType<typeof createRootWithCorePlugins>) {
  const deadline = Date.now() + 60_000;
  let lastStatus = 0;
  while (Date.now() < deadline) {
    ({ status: lastStatus } = await getSupertest(root, 'get', '/api/licensing/info').set(
      'x-elastic-internal-origin',
      'kibana'
    ));
    if (lastStatus !== 503) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for license to become available (last status ${lastStatus})`);
}

export async function setupTestServers(settings = {}) {
  const { startES } = createTestServers({
    adjustTimeout: (t) => jest.setTimeout(t),
    settings: {
      es: {
        license: 'trial',
      },
    },
  });

  const esServer = await startES();

  const root = createRootWithCorePlugins(settings, { oss: false });

  try {
    await root.preboot();
    const coreSetup = await root.setup();
    const coreStart = await root.start();

    await waitForLicense(root);

    return {
      esServer,
      kibanaServer: {
        root,
        coreSetup,
        coreStart,
        stop: async () => await root.shutdown(),
      },
    };
  } catch (error) {
    // The callers only get the handles once this resolves, so their `afterAll` cannot stop the
    // servers when setup fails. Stop them here; otherwise the leaked processes keep Jest alive
    // until the CI job times out.
    await root.shutdown().catch(() => {});
    await esServer.stop().catch(() => {});
    throw error;
  }
}
