/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';

import { TagManagementPage } from './tag_management_page';
import { SavedObjectsListingPage } from './saved_objects_listing_page';
import { SavedObjectsManagementPage } from './saved_objects_management_page';

export interface TaggingPageObjects extends PageObjects {
  tagManagement: TagManagementPage;
  savedObjectsListing: SavedObjectsListingPage;
  savedObjectsManagement: SavedObjectsManagementPage;
}

export function extendPageObjects(pageObjects: PageObjects, page: ScoutPage): TaggingPageObjects {
  return {
    ...pageObjects,
    tagManagement: createLazyPageObject(TagManagementPage, page),
    savedObjectsListing: createLazyPageObject(SavedObjectsListingPage, page),
    savedObjectsManagement: createLazyPageObject(SavedObjectsManagementPage, page),
  };
}
