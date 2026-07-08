/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';

import { SavedObjectsManagementPage } from './saved_objects_management_page';
import { SpacesPage } from './spaces';

export interface SpacesPageObjects extends PageObjects {
  spaces: SpacesPage;
  savedObjectsManagement: SavedObjectsManagementPage;
}

export function extendPageObjects(
  pageObjects: PageObjects,
  page: ScoutPage,
  kbnUrl: KibanaUrl
): SpacesPageObjects {
  return {
    ...pageObjects,
    spaces: createLazyPageObject(SpacesPage, page),
    savedObjectsManagement: createLazyPageObject(SavedObjectsManagementPage, page, kbnUrl),
  };
}
