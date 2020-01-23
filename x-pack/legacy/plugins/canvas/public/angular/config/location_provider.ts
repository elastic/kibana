/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILocationProvider } from 'angular';
import { CoreStart, CanvasStartDeps } from '../../plugin';

export function initLocationProvider(coreStart: CoreStart, plugins: CanvasStartDeps) {
  // disable angular's location provider
  const app = plugins.__LEGACY.uiModules.get('apps/canvas');

  app.config(($locationProvider: ILocationProvider) => {
    $locationProvider.html5Mode({
      enabled: false,
      requireBase: false,
      rewriteLinks: false,
    });
  });
}
