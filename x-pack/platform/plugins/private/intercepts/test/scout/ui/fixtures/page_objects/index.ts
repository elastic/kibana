/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLazyPageObject } from '@kbn/scout';
import type { PageObjects, ScoutPage } from '@kbn/scout';
import { InterceptsPageObject } from './intercepts';

export interface InterceptsExtendedPageObjects extends PageObjects {
  intercepts: InterceptsPageObject;
}

export function extendPageObjects(
  pageObjects: PageObjects,
  page: ScoutPage
): InterceptsExtendedPageObjects {
  return {
    ...pageObjects,
    intercepts: createLazyPageObject(InterceptsPageObject, page),
  };
}
