/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import template from './index.html';
import { LicenseViewController } from './controller';

uiRoutes.when('/license', {
  template,
  resolve: {
    clusters: (Private) => {
      const routeInit = Private(routeInitProvider);
      return routeInit();
    }
  },
  controllerAs: 'licenseView',
  controller: LicenseViewController
});
