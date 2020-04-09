/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
import { RollupPlugin } from './plugin';

const plugin = new RollupPlugin();

export const setup = plugin.setup(npSetup.core, npSetup.plugins);
export const start = plugin.start(npStart.core, npStart.plugins);
