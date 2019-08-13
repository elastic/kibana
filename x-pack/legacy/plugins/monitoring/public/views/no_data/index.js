/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';
import template from './index.html';
import { NoDataController } from './controller';
import { CODE_PATH_LICENSE } from '../../../common/constants';
uiRoutes
  .when('/no-data', {
    template,
    resolve: {
      clusters: $injector => {
        const monitoringClusters = $injector.get('monitoringClusters');
        const kbnUrl = $injector.get('kbnUrl');

        return monitoringClusters(undefined, undefined, [CODE_PATH_LICENSE]).then(clusters => {
          if (clusters && clusters.length) {
            kbnUrl.changePath('/home');
            return Promise.reject();
          }
          return Promise.resolve();
        });
      }
    },
    controller: NoDataController
  })
  .otherwise({ redirectTo: '/home' });
