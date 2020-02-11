/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
import { aggTypeFilters } from 'ui/agg_types';
import { aggTypeFieldFilters } from 'ui/agg_types';
import { addSearchStrategy } from '../../../../../src/plugins/data/public';
import { RollupPlugin } from './plugin';
import { setup as management } from '../../../../../src/legacy/core_plugins/management/public/legacy';
import { extensionsService } from '../../index_management/public';

const plugin = new RollupPlugin();

export const setup = plugin.setup(npSetup.core, {
  ...npSetup.plugins,
  __LEGACY: {
    aggTypeFilters,
    aggTypeFieldFilters,
    addSearchStrategy,
    indexManagementExtensions: extensionsService,
    managementLegacy: management,
  },
});
export const start = plugin.start(npStart.core);
