/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
import { getFormat } from './legacy_imports';

export * from './types';

import { plugin } from './index';

const pluginInstance = plugin();
pluginInstance.setup(npSetup.core, { ...npSetup.plugins, __LEGACY: { formatFactory: getFormat } });
pluginInstance.start(npStart.core, npStart.plugins);
