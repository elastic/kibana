/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PageObjects, ScoutPage, createLazyPageObject } from '@kbn/scout';
import { PainlessLab } from './painless_lab_page';

export interface PainlessLabPageObjects extends PageObjects {
  painlessLab: PainlessLab;
}

export function extendPageObjects(
  pageObjects: PageObjects,
  page: ScoutPage
): PainlessLabPageObjects {
  return {
    ...pageObjects,
    painlessLab: createLazyPageObject(PainlessLab, page),
  };
}
