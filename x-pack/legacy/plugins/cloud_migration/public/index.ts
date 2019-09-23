/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createShim } from './shim';
import { CloudMigrationPlugin } from './plugin';

export const plugin = () => new CloudMigrationPlugin();

// In Legacy world we need to manually create the plugin and start it
const { core, plugins } = createShim();
plugin().start(core, plugins);
