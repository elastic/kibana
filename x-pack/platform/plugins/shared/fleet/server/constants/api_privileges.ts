/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTEGRATIONS_PLUGIN_ID, PLUGIN_ID } from '../../common';

export const FLEET_API_PRIVILEGES = {
  FLEET: {
    READ: `${PLUGIN_ID}-read`,
    ALL: `${PLUGIN_ID}-all`,
  },
  AGENTS: {
    READ: `${PLUGIN_ID}-agents-read`,
    ALL: `${PLUGIN_ID}-agents-all`,
  },
  AGENT_POLICIES: {
    READ: `${PLUGIN_ID}-agent-policies-read`,
    ALL: `${PLUGIN_ID}-agent-policies-all`,
  },
  SETTINGS: {
    READ: `${PLUGIN_ID}-settings-read`,
    ALL: `${PLUGIN_ID}-settings-all`,
  },
  GENERATE_REPORTS: {
    ALL: `${PLUGIN_ID}-generate-report`,
  },
  INTEGRATIONS: {
    READ: `${INTEGRATIONS_PLUGIN_ID}-read`,
    ALL: `${INTEGRATIONS_PLUGIN_ID}-all`,
  },
  SETUP: `fleet-setup`,
};
