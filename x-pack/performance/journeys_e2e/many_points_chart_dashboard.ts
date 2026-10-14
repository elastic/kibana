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
    beforeSteps: async ({ es }) => {
      await es.cluster.putSettings({
        persistent: { 'esql.query.result_truncation_max_size': 1_000_000 },
      });
    },
    esArchives: ['x-pack/performance/es_archives/million_integers'],
    kbnArchives: ['x-pack/performance/kbn_archives/many_points_dashboard.json'],
  }),
  dashboardName: 'Many points',
  dashboardLinkSubj: 'dashboardListingTitleLink-Many-points',
  visualizationCount: 1,
});
