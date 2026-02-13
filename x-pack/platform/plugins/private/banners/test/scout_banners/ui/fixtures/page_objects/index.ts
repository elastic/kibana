/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import { BannersPageObject } from './banners';

export interface BannersExtendedPageObjects extends PageObjects {
  banners: BannersPageObject;
}

export function extendPageObjects(
  pageObjects: PageObjects,
  page: ScoutPage
): BannersExtendedPageObjects {
  return {
    ...pageObjects,
    banners: createLazyPageObject(BannersPageObject, page),
  };
}
