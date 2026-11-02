/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';

import { DatasetQualityPage } from './dataset_quality_page';
import { DatasetQualityDetailsPage } from './dataset_quality_details_page';

export { DatasetQualityPage } from './dataset_quality_page';
export { DatasetQualityDetailsPage } from './dataset_quality_details_page';
export type { SummaryPanelKpi } from './dataset_quality_page';
export type { DetailsSummaryKpi } from './dataset_quality_details_page';

export interface DatasetQualityPageObjects extends PageObjects {
  datasetQuality: DatasetQualityPage;
  datasetQualityDetails: DatasetQualityDetailsPage;
}

export const extendPageObjects = (
  pageObjects: PageObjects,
  page: ScoutPage
): DatasetQualityPageObjects => ({
  ...pageObjects,
  datasetQuality: createLazyPageObject(DatasetQualityPage, page),
  datasetQualityDetails: createLazyPageObject(DatasetQualityDetailsPage, page),
});
