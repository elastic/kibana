/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  createRootWithCorePlugins,
  createTestServers,
  getSupertest,
} from '@kbn/core-test-helpers-kbn-server';
import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { PATTERN_TESTER_ROUTE_PATH } from '../routes/pattern_tester';

const callPatternTester = () =>
  getSupertest(kibanaServer.root, 'post', PATTERN_TESTER_ROUTE_PATH)
    .set('kbn-xsrf', 'true')
    .set('x-elastic-internal-origin', 'kibana')
    .send({ input: { contact: 'a.mehta@example.com' }, rules: [] });

let esServer: TestElasticsearchUtils;
let kibanaServer: TestKibanaUtils;

// Runs against its own Elasticsearch, so downgrading its license cannot affect any other suite.
describe('pattern tester license gate', () => {
  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t) => jest.setTimeout(t),
      settings: { es: { license: 'trial' } },
    });
    esServer = await startES();

    const root = createRootWithCorePlugins(
      {
        // Only what the route needs: loading every x-pack plugin is slow and leaves many of them
        // logging after Elasticsearch is stopped.
        plugins: {
          paths: [
            join(REPO_ROOT, 'x-pack/platform/plugins/shared/licensing'),
            join(REPO_ROOT, 'x-pack/platform/plugins/private/ai_anonymization_settings'),
          ],
        },
        xpack: {
          // Kibana learns about a license change by polling, so poll quickly.
          licensing: { api_polling_frequency: '1s' },
          // The tester's worker threads do not run under Jest, so keep it from running a pattern: the
          // route then answers 503 once the license check has passed, which is what this test needs.
          aiAnonymizationSettings: { patternTester: { enabled: false } },
        },
      },
      { oss: true }
    );
    await root.preboot();
    const coreSetup = await root.setup();
    const coreStart = await root.start();
    kibanaServer = { root, coreSetup, coreStart, stop: async () => root.shutdown() };
  });

  afterAll(async () => {
    await kibanaServer?.stop();
    await esServer?.stop();
  });

  it('lets a trial license through the license check and refuses once the license is basic', async () => {
    // Past the license check, stopped only by the disabled tester (see the settings above).
    expect((await callPatternTester()).status).toBe(503);

    await esServer.es.getClient().license.postStartBasic({ acknowledge: true });

    // Kibana polls Elasticsearch for the license, so it learns of the downgrade a moment later.
    let status = 200;
    for (let attempt = 0; attempt < 60 && status !== 403; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      status = (await callPatternTester()).status;
    }
    expect(status).toBe(403);
  });
});
