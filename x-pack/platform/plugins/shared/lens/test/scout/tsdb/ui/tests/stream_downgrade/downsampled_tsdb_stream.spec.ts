/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { enableElasticChartDebug, test } from '../../fixtures';
import { createStreamScenario } from '../../fixtures/stream_scenario';

const scenario = createStreamScenario({
  direction: 'downgrade',
  variant: 'downsampled_tsdb_stream',
});

test.describe(
  'Lens TSDB stream downgrade: supports a downgraded TSDB data stream with a downsampled TSDB stream',
  { tag: tags.deploymentAgnostic },
  () => {
    test.beforeAll(async ({ apiServices, tsdbHelper, uiSettings }) => {
      await scenario.setup({ apiServices, tsdbHelper, uiSettings });
    });

    test.beforeEach(async ({ browserAuth, context }) => {
      await enableElasticChartDebug(context);
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async () => scenario.cleanup());

    test('keeps the counter field compatible with Average', async ({ page, pageObjects }) => {
      await scenario.assertAverageCompatibility({ page, pageObjects });
    });

    test('counts documents before and after the downgrade', async ({ pageObjects }) => {
      await scenario.assertDowngradeCounts({ pageObjects });
    });

    test('visualizes data on both sides of the downgrade boundary', async ({ pageObjects }) => {
      await scenario.assertDowngradeBoundary({ pageObjects });
    });
  }
);
