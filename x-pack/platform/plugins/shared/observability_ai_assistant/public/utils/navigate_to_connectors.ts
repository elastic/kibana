/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart, HttpStart } from '@kbn/core/public';

export function getModelManagementHref(http: HttpStart) {
  return http.basePath.prepend('/app/management/modelManagement/model_settings');
}

export function navigateToModelManagementApp(application: ApplicationStart) {
  application.navigateToApp('management', {
    path: '/modelManagement/model_settings',
  });
}
