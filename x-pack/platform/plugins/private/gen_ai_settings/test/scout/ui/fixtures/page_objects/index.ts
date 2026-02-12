/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';

import { GenAiSettingsPage } from './gen_ai_settings_page';

export interface GenAiSettingsPageObjects extends PageObjects {
  genAiSettings: GenAiSettingsPage;
}

export function extendPageObjects(
  pageObjects: PageObjects,
  page: ScoutPage
): GenAiSettingsPageObjects {
  return {
    ...pageObjects,
    genAiSettings: createLazyPageObject(GenAiSettingsPage, page),
  };
}
