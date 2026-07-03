/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import { SearchProfilerPage } from './search_profiler_page';

export interface SearchProfilerPageObjects extends PageObjects {
  searchProfiler: SearchProfilerPage;
}

export const extendPageObjects = (
  pageObjects: PageObjects,
  page: ScoutPage
): SearchProfilerPageObjects => ({
  ...pageObjects,
  searchProfiler: createLazyPageObject(SearchProfilerPage, page),
});
