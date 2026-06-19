/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

/**
 * These tests require the `connectors_custom_config` server config set, which sets
 * non-default `xpack.actions.*` options (enabled email services, AWS SES host/port,
 * webhook PFX disabled).
 */
export default createPlaywrightConfig({
  testDir: './tests',
});
