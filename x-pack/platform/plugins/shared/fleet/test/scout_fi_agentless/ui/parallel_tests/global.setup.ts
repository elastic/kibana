/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';

globalSetupHook('Fleet Identity Federation agentless setup', async ({ log }) => {
  log.info('[setup] Fleet FI agentless setup complete');
  log.info('[setup] aws package is pre-installed via server config (fi_agentless config set)');
  log.info('[setup] API calls to /api/fleet/cloud_connectors and /api/fleet/managed_integrations');
  log.info('[setup] are intercepted by Playwright page.route() in each test — no real agentless');
  log.info('[setup] controller or AWS account is contacted.');
});
