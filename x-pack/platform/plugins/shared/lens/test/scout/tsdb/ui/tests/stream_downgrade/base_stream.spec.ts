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
  getDowngradeBoundaryData,
  sumFirstNValues,
  test,
} from '../../fixtures';
import { getIncompatibleAverageCount, getCountBars } from '../../fixtures/stream_chart_helpers';

const RESOURCE_SUFFIX = randomUUID();
// Serverless Security's editor role grants data access to the sample-data namespace.
const BASE_STREAM = `kibana_sample_data_lens_tsdb_downgrade_${RESOURCE_SUFFIX}`;
const TIME_RANGE = createTsdbScenarioTimeRange();

// The downgraded base stream has mixed backing-index mappings (old TSDB + new regular).
// Elasticsearch field caps reports metric_conflicts_indices and omits time_series_metric,
// so Lens sees bytes_counter as a plain numeric field and keeps Average enabled — even when
// another pure TSDB stream is added to the data view.

const scenario = createTsdbStreamScenario({
  baseStream: BASE_STREAM,
  baseStreamKind: 'downgraded',
  indexes: [{ index: BASE_STREAM }],
  timeRange: TIME_RANGE,
});

test.describe(
  'Lens TSDB stream downgrade: supports a downgraded TSDB data stream without additional indices',
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

    test('counts documents before and after the downgrade', async ({ pageObjects }) => {
      const bars = await getCountBars({ pageObjects });
      expect(bars.length).toBeGreaterThan(0);

      // Bucket boundaries can vary with chart interval selection. Lens does not count a
      // downsample target as an additional contribution beside its source stream.
      const columnsToCheck = Math.floor(bars.length / 2);
      expect
        .soft(sumFirstNValues(columnsToCheck, bars))
        .toBeGreaterThan(scenario.expectedDocumentCountBeforeRollover - 1);
      expect
        .soft(sumFirstNValues(columnsToCheck, [...bars].reverse()))
        .toBeGreaterThan(TSDB_SCENARIO_DOCUMENT_COUNT - 1);
    });

    test('visualizes data on both sides of the downgrade boundary', async ({ pageObjects }) => {
      const { hasDataBeforeDowngrade, hasDataAfterDowngrade } = await getDowngradeBoundaryData({
        pageObjects,
        timeRange: TIME_RANGE,
        configureMetricDimension: async () => {
          await pageObjects.lens.configureDimension({
            dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
            operation: 'count',
          });
        },
      });

      expect.soft(hasDataBeforeDowngrade).toBe(true);
      expect.soft(hasDataAfterDowngrade).toBe(true);
    });
  }
);
