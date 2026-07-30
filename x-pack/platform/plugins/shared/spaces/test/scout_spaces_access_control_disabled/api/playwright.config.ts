/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

// The `scout_spaces_access_control_disabled` directory name selects the matching kbn-scout server
// config set (loads the access-control test plugin + `savedObjects.enableAccessControl=false`).
export default createPlaywrightConfig({
  testDir: './tests',
});
