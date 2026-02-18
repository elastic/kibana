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
    esArchives: ['src/platform/test/functional/fixtures/es_archiver/stress_test'],
    kbnArchives: ['src/platform/test/functional/fixtures/kbn_archiver/stress_test'],
  }),
  dashboardName: 'Stress Test Dashboard',
  dashboardLinkSubj: 'dashboardListingTitleLink-Stresstest',
  visualizationCount: 1,
  setup: async (kibanaServer) => {
    await kibanaServer.uiSettings.update({ 'histogram:maxBars': 100 });
  },
});
