/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreStart } from '../../../../../src/core/public';

import { registerManagementSection } from './register_management_section';
import { registerRoutes } from './register_routes';
import { LegacyStart } from './legacy';

import { httpService } from './app/services/http';

export class IndexMgmtPlugin {
  public start(core: CoreStart, plugins: {}, __LEGACY: LegacyStart) {
    const { management } = __LEGACY;
    const { http } = core;

    // Initialize services
    httpService.init(http);

    // Register management section and Angular route
    registerManagementSection(management.getSection('elasticsearch'));
    registerRoutes();
  }
}
