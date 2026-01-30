/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDashboardJourney } from './utils/dashboard_journey';

export const journey = createDashboardJourney({
  esArchives: ['x-pack/performance/es_archives/sample_data_ecommerce_many_fields'],
  kbnArchives: ['x-pack/performance/kbn_archives/ecommerce_saved_search_only_dashboard'],
  dashboardName: 'Ecommerce Dashboard with Saved Search only',
  dashboardLinkSubj: 'dashboardListingTitleLink-[eCommerce]-Saved-Search-Dashboard',
  visualizationCount: 1,
});
