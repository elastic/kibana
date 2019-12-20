/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
import { aggTypeFilters } from 'ui/agg_types/filter';
import { aggTypeFieldFilters } from 'ui/agg_types/param_types/filter';
import { editorConfigProviders } from 'ui/vis/editors/config/editor_config_providers';
import { addSearchStrategy } from 'ui/courier';
import { RollupPlugin } from './plugin';
import { setup as management } from '../../../../../src/legacy/core_plugins/management/public/legacy';
import { addBadgeExtension, addToggleExtension } from '../../index_management/public';
// @ts-ignore
import { registerRollupApp } from './angular';

const plugin = new RollupPlugin();

export const setup = plugin.setup(npSetup.core, {
  ...npSetup.plugins,
  __LEGACY: {
    aggTypeFilters,
    aggTypeFieldFilters,
    editorConfigProviders,
    addSearchStrategy,
    addBadgeExtension,
    addToggleExtension,
    management,
  },
});
export const start = plugin.start(npStart.core, {
  ...npStart.plugins,
  __LEGACY: {
    registerRollupApp,
  },
});
