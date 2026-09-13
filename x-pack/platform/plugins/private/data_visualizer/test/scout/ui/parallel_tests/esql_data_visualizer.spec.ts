/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/expect-expect */

import { ML_JOB_FIELD_TYPES } from '@kbn/ml-anomaly-utils';
import { tags, test as scoutTest } from '@kbn/scout';
import { spaceTest } from '../fixtures';
import type { ExtParallelRunTestFixtures } from '../fixtures';
import type { MetricFieldVisConfig, NonMetricFieldVisConfig } from '../fixtures/types';
import {
  assertMetricFieldsDocCounts,
  assertNonMetricFieldContents,
  assertNumberFieldContents,
  assertTableRowCount,
} from '../fixtures/field_stats_assertions';

interface EsqlTestData {
  suiteTitle: string;
  query: string;
  sourceIndexOrSavedSearch?: string;
  expected: {
    hasDocCountChart: boolean;
    initialLimitSize?: string;
    totalDocCountFormatted: string;
    metricFields?: MetricFieldVisConfig[];
    nonMetricFields?: NonMetricFieldVisConfig[];
    emptyFields: string[];
    visibleMetricFieldsCount: number;
    totalMetricFieldsCount: number;
    populatedFieldsCount: number;
    totalFieldsCount: number;
  };
}

const esqlFarequoteData: EsqlTestData = {
  suiteTitle: 'ES|QL farequote',
  query: 'from ft_farequote',
  sourceIndexOrSavedSearch: 'ft_farequote',
  expected: {
    hasDocCountChart: true,
    initialLimitSize: '5,000 (100%)',
    totalDocCountFormatted: '86,274',
    metricFields: [
      {
        fieldName: 'responsetime',
        type: ML_JOB_FIELD_TYPES.NUMBER,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '10,000 (100%)',
        statsMaxDecimalPlaces: 3,
        topValuesCount: 11,
        viewableInLens: false,
      },
    ],
    nonMetricFields: [
      {
        fieldName: '@timestamp',
        type: ML_JOB_FIELD_TYPES.DATE,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '10,000 (100%)',
        exampleCount: 2,
        viewableInLens: false,
      },
      {
        fieldName: '@version',
        type: ML_JOB_FIELD_TYPES.TEXT,
        existsInDocs: true,
        aggregatable: false,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '10,000 (100%)',
        viewableInLens: false,
      },
      {
        fieldName: '@version.keyword',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '10,000 (100%)',
        viewableInLens: false,
      },
      {
        fieldName: 'airline',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 10,
        docCountFormatted: '10,000 (100%)',
        viewableInLens: false,
      },
      {
        fieldName: 'type',
        type: ML_JOB_FIELD_TYPES.TEXT,
        existsInDocs: true,
        aggregatable: false,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '10,000 (100%)',
        viewableInLens: false,
      },
      {
        fieldName: 'type.keyword',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '10,000 (100%)',
        viewableInLens: false,
      },
    ],
    emptyFields: ['sourcetype'],
    visibleMetricFieldsCount: 1,
    totalMetricFieldsCount: 1,
    populatedFieldsCount: 7,
    totalFieldsCount: 8,
  },
};

const esqlSampleLogData: EsqlTestData = {
  suiteTitle: 'ES|QL module_sample_logs',
  query: `from ft_module_sample_logs
| where bytes > 7000 and response.keyword == "200"
| eval bytes_kb = bytes/1000
| stats max_bytes_kb = max(bytes_kb), min_machine_ram = min(machine.ram) by clientip, geo.coordinates`,
  sourceIndexOrSavedSearch: 'ft_module_sample_logs',
  expected: {
    hasDocCountChart: false,
    totalDocCountFormatted: '143',
    metricFields: [
      {
        fieldName: 'max_bytes_kb',
        type: ML_JOB_FIELD_TYPES.NUMBER,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '143 (100%)',
        statsMaxDecimalPlaces: 3,
        topValuesCount: 12,
        viewableInLens: false,
      },
      {
        fieldName: 'min_machine_ram',
        type: ML_JOB_FIELD_TYPES.NUMBER,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '143 (100%)',
        statsMaxDecimalPlaces: 3,
        topValuesCount: 20,
        viewableInLens: false,
      },
    ],
    nonMetricFields: [
      {
        fieldName: 'geo.coordinates',
        type: ML_JOB_FIELD_TYPES.GEO_POINT,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '143 (100%)',
        exampleCount: 10,
        viewableInLens: false,
      },
      {
        fieldName: 'clientip',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '143 (100%)',
        exampleCount: 10,
        viewableInLens: false,
      },
    ],
    emptyFields: [],
    visibleMetricFieldsCount: 2,
    totalMetricFieldsCount: 2,
    populatedFieldsCount: 4,
    totalFieldsCount: 4,
  },
};

const runEsqlDataVisualizerTests = async ({
  pageObjects,
  data,
}: {
  pageObjects: ExtParallelRunTestFixtures['pageObjects'];
  data: EsqlTestData;
}) => {
  await scoutTest.step(`${data.suiteTitle} loads the ES|QL data visualizer page`, async () => {
    await pageObjects.mlNavigation.navigateToDataVisualizer();
    await pageObjects.dataVisualizerSelector.navigateToESQLVisualizer();
  });

  await scoutTest.step('shows the ES|QL editor and top panels', async () => {
    await pageObjects.indexDataVisualizer.waitForTimeRangeSelectorSection();
  });

  await scoutTest.step(`${data.suiteTitle} displays index details`, async () => {
    await pageObjects.dataVisualizerSelector.setESQLQuery(data.query);
    await assertTableRowCount(pageObjects.dataVisualizerTable, 0);

    await pageObjects.indexDataVisualizer.clickUseFullDataButton(
      data.expected.totalDocCountFormatted,
      'none'
    );

    await pageObjects.indexDataVisualizer.waitForTotalDocCountHeader();

    await pageObjects.indexDataVisualizer.waitForTotalDocCountChartIfNeeded(
      data.expected.hasDocCountChart
    );

    await pageObjects.indexDataVisualizer.waitForDataVisualizerTable();
    await pageObjects.indexDataVisualizer.waitForFieldCountPanel();
    await pageObjects.indexDataVisualizer.waitForMetricFieldsSummary();
    await pageObjects.indexDataVisualizer.waitForFieldsSummary();
    await pageObjects.indexDataVisualizer.waitForVisibleMetricFieldsCount(
      data.expected.visibleMetricFieldsCount
    );
    await pageObjects.indexDataVisualizer.waitForTotalMetricFieldsCount(
      data.expected.totalMetricFieldsCount
    );
    await pageObjects.indexDataVisualizer.waitForVisibleFieldsCount(
      data.expected.populatedFieldsCount
    );
    await pageObjects.indexDataVisualizer.waitForTotalFieldsCount(data.expected.totalFieldsCount);

    await pageObjects.dataVisualizerTable.setShowEmptyFieldsSwitchState(true);
    for (const fieldName of data.expected.emptyFields) {
      await pageObjects.dataVisualizerTable.waitForRow(fieldName);
    }
  });

  await scoutTest.step(`${data.suiteTitle} updates data when limit size changes`, async () => {
    await assertMetricFieldsDocCounts(
      pageObjects.dataVisualizerTable,
      data.expected.metricFields as Array<Required<MetricFieldVisConfig>>,
      data.expected.initialLimitSize
    );

    await pageObjects.dataVisualizerSelector.setLimitSize(10000);

    for (const fieldRow of data.expected.metricFields as Array<Required<MetricFieldVisConfig>>) {
      await assertNumberFieldContents(
        pageObjects.dataVisualizerTable,
        fieldRow.fieldName,
        fieldRow.docCountFormatted,
        undefined,
        false,
        false,
        false
      );
    }

    for (const fieldRow of data.expected.nonMetricFields ?? []) {
      await assertNonMetricFieldContents(
        pageObjects.dataVisualizerTable,
        fieldRow.type,
        fieldRow.fieldName,
        fieldRow.docCountFormatted,
        fieldRow.exampleCount,
        false,
        false,
        undefined
      );
    }
  });
};

spaceTest.describe('esql data visualizer', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ mlTestResources, scoutSpace }) => {
    await mlTestResources.setKibanaTimeZoneToUTC(scoutSpace.id);
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  spaceTest.afterAll(async ({ mlTestResources, scoutSpace }) => {
    await mlTestResources.resetKibanaTimeZone(scoutSpace.id);
  });

  spaceTest('with farequote', async ({ pageObjects }) => {
    await runEsqlDataVisualizerTests({ pageObjects, data: esqlFarequoteData });
  });

  spaceTest('with module_sample_logs', async ({ pageObjects }) => {
    await runEsqlDataVisualizerTests({ pageObjects, data: esqlSampleLogData });
  });
});
