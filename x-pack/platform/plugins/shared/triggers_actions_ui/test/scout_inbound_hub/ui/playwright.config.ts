/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

// The 'scout_inbound_hub' directory name auto-selects the 'inbound_hub' kbn-scout
// config set, which turns on xpack.actions.inboundEvents so the connector form
// shows the Receive events switch for dual connectors.
export default createPlaywrightConfig({
  testDir: './tests',
});
