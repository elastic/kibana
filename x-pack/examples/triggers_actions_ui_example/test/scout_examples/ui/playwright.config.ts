/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

/**
 * Runs under the `examples` server config set, which loads developer example
 * plugins (incl. triggersActionsUiExample) via --plugin-path.
 */
export default createPlaywrightConfig({
  testDir: './tests',
});
