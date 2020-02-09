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
import { breadcrumbService } from './app/services/breadcrumbs';
import { documentationService } from './app/services/documentation';
import { notificationService } from './app/services/notification';
import { uiMetricService } from './app/services/ui_metric';

export class IndexMgmtPlugin {
  public start(core: CoreStart, plugins: {}, __LEGACY: LegacyStart) {
    const { management, uiMetric } = __LEGACY;
    const { http, chrome, docLinks, notifications } = core;

    // Initialize services
    httpService.init(http);
    breadcrumbService.init(chrome, management.constants.BREADCRUMB);
    documentationService.init(docLinks);
    notificationService.init(notifications);
    uiMetricService.init(uiMetric.createUiStatsReporter);

    // Register management section and Angular route
    registerManagementSection(management.getSection('elasticsearch'));
    registerRoutes(core);
  }
}
