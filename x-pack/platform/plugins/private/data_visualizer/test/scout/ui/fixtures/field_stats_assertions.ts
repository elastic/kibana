/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_JOB_FIELD_TYPES } from '@kbn/ml-anomaly-utils';
import { expect } from '@kbn/scout/ui';
import type { DataVisualizerTable } from './page_objects/data_visualizer_table';

const assertDateFieldContents = async (
  table: DataVisualizerTable,
  fieldName: string,
  docCountFormatted: string
) => {
  await table.waitForRow(fieldName);
  await expect.poll(() => table.getFieldDocCount(fieldName)).toBe(docCountFormatted);
  await table.ensureDetailsOpen(fieldName);
  await expect(table.detailsLocator(fieldName, 'dataVisualizerDateSummaryTable')).toBeVisible();
  await table.ensureDetailsClosed(fieldName);
};

const assertKeywordFieldContents = async (
  table: DataVisualizerTable,
  fieldName: string,
  docCountFormatted: string,
  topValuesCount: number,
  exampleContent?: string[]
) => {
  await table.waitForRow(fieldName);
  await expect.poll(() => table.getFieldDocCount(fieldName)).toBe(docCountFormatted);
  await table.ensureDetailsOpen(fieldName);
  await expect(
    table.detailsLocator(fieldName, 'dataVisualizerFieldDataTopValuesContent')
  ).toBeVisible();
  await expect.poll(() => table.getTopValuesCount(fieldName)).toBe(topValuesCount);

  if (exampleContent) {
    await expect.poll(() => table.getTopValuesBarTexts(fieldName)).toStrictEqual(exampleContent);
  }

  await table.ensureDetailsClosed(fieldName);
};

const assertTextFieldContents = async (
  table: DataVisualizerTable,
  fieldName: string,
  docCountFormatted: string,
  expectedExamplesCount: number
) => {
  await table.waitForRow(fieldName);
  await expect.poll(() => table.getFieldDocCount(fieldName)).toBe(docCountFormatted);

  if (expectedExamplesCount > 0) {
    await table.ensureDetailsOpen(fieldName);
    await expect.poll(() => table.getExamplesListCount(fieldName)).toBe(expectedExamplesCount);
    await table.ensureDetailsClosed(fieldName);
  }
};

const assertGeoPointFieldContents = async (
  table: DataVisualizerTable,
  fieldName: string,
  docCountFormatted: string,
  expectedExamplesCount: number
) => {
  await table.waitForRow(fieldName);
  await expect.poll(() => table.getFieldDocCount(fieldName)).toBe(docCountFormatted);
  await table.ensureDetailsOpen(fieldName);
  await expect.poll(() => table.getExamplesListCount(fieldName)).toBe(expectedExamplesCount);
  await expect(table.detailsLocator(fieldName, 'mapContainer')).toBeVisible();
  await table.ensureDetailsClosed(fieldName);
};

const assertUnknownFieldContents = async (
  table: DataVisualizerTable,
  fieldName: string,
  docCountFormatted: string
) => {
  await table.waitForRow(fieldName);
  await expect.poll(() => table.getFieldDocCount(fieldName)).toBe(docCountFormatted);
  await table.ensureDetailsOpen(fieldName);
  await expect(table.detailsLocator(fieldName, 'dataVisualizerDocumentStatsContent')).toBeVisible();
  await table.ensureDetailsClosed(fieldName);
};

const assertViewInLens = async (
  table: DataVisualizerTable,
  fieldName: string,
  viewableInLens: boolean,
  hasActionMenu?: boolean
) => {
  if (viewableInLens) {
    if (hasActionMenu) {
      await table.ensureActionsMenuOpen(fieldName);
      await expect.poll(() => table.isActionMenuViewInLensEnabled(fieldName)).toBe(true);
      await table.ensureAllMenuPopoversClosed();
    } else {
      await expect.poll(() => table.isViewInLensActionEnabled(fieldName)).toBe(true);
    }
  } else {
    await table.waitForViewInLensActionHidden(fieldName);
  }
};

export const assertTableRowCount = async (table: DataVisualizerTable, expectedRowCount: number) => {
  await expect
    .poll(async () => (await table.parseDataVisualizerTable()).length)
    .toBe(expectedRowCount);
};

export const assertFieldDocCount = async (
  table: DataVisualizerTable,
  fieldName: string,
  docCountFormatted: string
) => {
  await expect.poll(() => table.getFieldDocCount(fieldName)).toBe(docCountFormatted);
};

export const assertNumberFieldContents = async (
  table: DataVisualizerTable,
  fieldName: string,
  docCountFormatted: string,
  topValuesCount?: number,
  viewableInLens?: boolean,
  hasActionMenu = false,
  checkDistributionPreviewExist = true
) => {
  await table.waitForRow(fieldName);
  await assertFieldDocCount(table, fieldName, docCountFormatted);
  await table.ensureDetailsOpen(fieldName);

  await expect(table.detailsLocator(fieldName, 'dataVisualizerNumberSummaryTable')).toBeVisible();

  if (topValuesCount !== undefined) {
    await expect(table.detailsLocator(fieldName, 'dataVisualizerFieldDataTopValues')).toBeVisible();
    await expect.poll(() => table.getTopValuesCount(fieldName)).toBe(topValuesCount);
  }

  if (checkDistributionPreviewExist) {
    await table.waitForDistributionPreview(fieldName);
  }

  if (viewableInLens !== undefined) {
    await assertViewInLens(table, fieldName, viewableInLens, hasActionMenu);
  }

  await table.ensureDetailsClosed(fieldName);
};

export const assertMetricFieldsDocCounts = async (
  table: DataVisualizerTable,
  metricFields: Array<{ fieldName: string }>,
  docCountFormatted: string | undefined
) => {
  if (docCountFormatted === undefined) {
    return;
  }

  for (const fieldRow of metricFields) {
    await assertNumberFieldContents(
      table,
      fieldRow.fieldName,
      docCountFormatted,
      undefined,
      false,
      false,
      false
    );
  }
};

export const assertNonMetricFieldContents = async (
  table: DataVisualizerTable,
  fieldType: string,
  fieldName: string,
  docCountFormatted: string,
  exampleCount: number,
  viewableInLens: boolean,
  hasActionMenu?: boolean,
  exampleContent?: string[]
) => {
  if (fieldType === ML_JOB_FIELD_TYPES.DATE) {
    await assertDateFieldContents(table, fieldName, docCountFormatted);
  } else if (fieldType === ML_JOB_FIELD_TYPES.KEYWORD) {
    await assertKeywordFieldContents(
      table,
      fieldName,
      docCountFormatted,
      exampleCount,
      exampleContent
    );
  } else if (fieldType === ML_JOB_FIELD_TYPES.TEXT) {
    await assertTextFieldContents(table, fieldName, docCountFormatted, exampleCount);
  } else if (fieldType === ML_JOB_FIELD_TYPES.GEO_POINT) {
    await assertGeoPointFieldContents(table, fieldName, docCountFormatted, exampleCount);
  } else if (fieldType === ML_JOB_FIELD_TYPES.UNKNOWN) {
    await assertUnknownFieldContents(table, fieldName, docCountFormatted);
  }

  await assertViewInLens(table, fieldName, viewableInLens, hasActionMenu);
};
