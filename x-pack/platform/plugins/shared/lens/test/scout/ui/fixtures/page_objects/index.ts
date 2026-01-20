/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLazyPageObject, type PageObjects, type ScoutPage } from '@kbn/scout';

import { LensPage } from './lens_page';

export interface LensPageObjects extends PageObjects {
  lens: LensPage;
}

export function extendPageObjects(pageObjects: PageObjects, page: ScoutPage): LensPageObjects {
  return {
    ...pageObjects,
    lens: createLazyPageObject(LensPage, page),
  };
}
