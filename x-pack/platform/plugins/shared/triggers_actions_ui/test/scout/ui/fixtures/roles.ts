/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

/**
 * Stack alerts + actions feature privileges, with read access to alerts indices.
 * Mirrors `alerts_and_actions_role` from the FTR functional_with_es_ssl config.
 */
export const getAlertsAndActionsRole = (): KibanaRole => ({
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: ['.alerts-*'],
        privileges: ['read'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        actions: ['all'],
        stackAlerts: ['all'],
      },
      spaces: ['*'],
    },
  ],
});

/**
 * Actions privilege only — no alerting access. Mirrors `only_actions_role` from the FTR config.
 * Used to assert the no-permission prompt on the rules page.
 */
export const getOnlyActionsRole = (): KibanaRole => ({
  elasticsearch: {
    cluster: [],
  },
  kibana: [
    {
      base: [],
      feature: {
        actions: ['all'],
      },
      spaces: ['*'],
    },
  ],
});
