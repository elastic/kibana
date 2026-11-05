/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import { LensEditorApp } from './lens';

export type LensPageObjects = Omit<PageObjects, 'lens'> & {
  lens: LensEditorApp;
};

export function extendPageObjects(pageObjects: PageObjects, page: ScoutPage): LensPageObjects {
  return {
    ...pageObjects,
    lens: createLazyPageObject(LensEditorApp, page),
  };
}
