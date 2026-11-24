/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

// Same 'inbound_hub' config set as the UI suite: inbound events are on, so a
// dual connector can be saved with receive events without the receive-only auth type.
export default createPlaywrightConfig({
  testDir: './tests',
});
