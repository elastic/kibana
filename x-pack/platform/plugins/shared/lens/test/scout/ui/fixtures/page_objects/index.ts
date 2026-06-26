/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import { LensFieldsListPage } from './lens_fields_list_page';

export interface LensFieldsListPageObjects extends PageObjects {
  lensFieldsList: LensFieldsListPage;
}

export const extendPageObjects = (
  pageObjects: PageObjects,
  page: ScoutPage
): LensFieldsListPageObjects => ({
  ...pageObjects,
  lensFieldsList: createLazyPageObject(LensFieldsListPage, page),
});
