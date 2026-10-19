/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  TSDB_SCENARIO_DOCUMENT_COUNT,
  createTsdbScenarioTimeRange,
  createTsdbStreamScenario,
  enableElasticChartDebug,
  sumFirstNValues,
  test,
} from '../../fixtures';
import {
  getIncompatibleAverageCount,
  getUpgradeBoundarySeries,
} from '../../fixtures/stream_chart_helpers';

const RESOURCE_SUFFIX = randomUUID();
// Serverless Security's editor role grants data access to the sample-data namespace.
const BASE_STREAM = `kibana_sample_data_lens_tsdb_upgrade_${RESOURCE_SUFFIX}`;
const ADDITIONAL_TSDB_STREAM = `kibana_sample_data_lens_tsdb_additional_${RESOURCE_SUFFIX}`;
const TIME_RANGE = createTsdbScenarioTimeRange();

const scenario = createTsdbStreamScenario({
  baseStream: BASE_STREAM,
  baseStreamKind: 'upgraded',
  indexes: [
    { index: BASE_STREAM },
    { index: ADDITIONAL_TSDB_STREAM, create: true, mode: 'tsdb', downsample: true },
  ],
  timeRange: TIME_RANGE,
});

test.describe(
  'Lens TSDB stream upgrade: supports an upgraded TSDB data stream with a downsampled TSDB stream',
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
      expect(await getIncompatibleAverageCount({ page, pageObjects })).toBe(0);
    });

    test('visualizes counter data before and after the upgrade', async ({ pageObjects }) => {
      const { counterBars, countBars } = await getUpgradeBoundarySeries({ pageObjects });
      expect(counterBars.length).toBeGreaterThan(0);
      expect(countBars.length).toBeGreaterThan(0);

      expect.soft(counterBars[0]?.y).toBe(5000);
      expect.soft(counterBars[counterBars.length - 1]?.y).toBe(5000);

      // Bucket boundaries can vary with chart interval selection. Lens does not count a
      // downsample target as an additional contribution beside its source stream.
      const columnsToCheck = Math.floor(countBars.length / 2);
      expect
        .soft(sumFirstNValues(columnsToCheck, countBars))
        .toBeGreaterThan(scenario.expectedDocumentCountBeforeRollover - 1);
      expect
        .soft(sumFirstNValues(columnsToCheck, [...countBars].reverse()))
        .toBeGreaterThan(TSDB_SCENARIO_DOCUMENT_COUNT - 1);
    });
  }
);
