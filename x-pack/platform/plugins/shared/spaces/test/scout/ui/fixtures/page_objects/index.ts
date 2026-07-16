/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';

import { CopySavedObjectsToSpaceFlyout } from './copy_saved_objects_to_space_flyout';
import { SavedObjectsManagementPage } from './saved_objects_management_page';
import { SpacesPage } from './spaces';

export { CopySavedObjectsToSpaceFlyout } from './copy_saved_objects_to_space_flyout';
export type {
  CopyToSpaceSetupOptions,
  CopyToSpaceSummary,
} from './copy_saved_objects_to_space_flyout';

export interface SpacesPageObjects extends PageObjects {
  spaces: SpacesPage;
  savedObjectsManagement: SavedObjectsManagementPage;
  copySavedObjectsToSpaceFlyout: CopySavedObjectsToSpaceFlyout;
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
    copySavedObjectsToSpaceFlyout: createLazyPageObject(CopySavedObjectsToSpaceFlyout, page),
  };
}
