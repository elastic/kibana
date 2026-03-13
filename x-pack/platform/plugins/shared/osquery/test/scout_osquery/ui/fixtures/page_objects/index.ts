/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import { LiveQueryPage } from './live_query';
import { PacksPage } from './packs';
import { SavedQueriesPage } from './saved_queries';

export interface OsqueryPageObjects extends PageObjects {
  liveQuery: LiveQueryPage;
  packs: PacksPage;
  savedQueries: SavedQueriesPage;
}

export function extendPageObjects(pageObjects: PageObjects, page: ScoutPage): OsqueryPageObjects {
  return {
    ...pageObjects,
    liveQuery: createLazyPageObject(LiveQueryPage, page),
    packs: createLazyPageObject(PacksPage, page),
    savedQueries: createLazyPageObject(SavedQueriesPage, page),
  };
}
