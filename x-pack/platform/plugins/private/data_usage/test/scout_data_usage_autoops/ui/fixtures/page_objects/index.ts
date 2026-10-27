/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { DataUsagePage } from './data_usage_page';

export interface DataUsagePageObjects extends PageObjects {
  dataUsage: DataUsagePage;
}

export const extendPageObjects = (
  pageObjects: PageObjects,
  page: ScoutPage
): DataUsagePageObjects => ({
  ...pageObjects,
  dataUsage: new DataUsagePage(page),
});
