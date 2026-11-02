/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { setupDashboardJourney } from '../utils/dashboard_journey';

export const journey = setupDashboardJourney({
  // call the journey constructor in this file so the name is set correctly
  journey: new Journey({
    esArchives: ['x-pack/performance/es_archives/sample_data_ecommerce_many_fields'],
    kbnArchives: ['x-pack/performance/kbn_archives/ecommerce_tsvb_gauge_only_dashboard'],
  }),
  dashboardName: 'Ecommerce Dashboard with TSVB Gauge only',
  dashboardLinkSubj: 'dashboardListingTitleLink-[eCommerce]-TSVB-Gauge-Only-Dashboard',
  visualizationCount: 1,
});
