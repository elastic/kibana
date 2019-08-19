/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import uiRoutes from 'ui/routes';
import template from './index.html';
import { CODE_PATH_LICENSE } from '../../../common/constants';
import { I18nContext } from 'ui/i18n';
import { render } from 'react-dom';
import { NoData } from '../../components/no_data/no_data';

const REACT_NODE_ID_NO_DATA = 'noDataReact';

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
    controller: class {
      constructor($injector, $scope) {
        $scope.$$postDigest(() => {
          render(
            <I18nContext>
              <NoData changePath={path => $scope.$apply(() => $injector.get('kbnUrl').changePath(path))} />
            </I18nContext>,
            document.getElementById(REACT_NODE_ID_NO_DATA)
          );
        });

      }
    }
  })
  .otherwise({ redirectTo: '/home' });
