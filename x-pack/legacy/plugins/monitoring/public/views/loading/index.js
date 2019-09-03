/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { PageLoading } from 'plugins/monitoring/components';
import uiRoutes from 'ui/routes';
import { I18nContext } from 'ui/i18n';
import template from './index.html';
import { toggleSetupMode, getSetupModeState, initSetupModeState } from '../../lib/setup_mode';
import { CODE_PATH_LICENSE } from '../../../common/constants';

const REACT_DOM_ID = 'monitoringLoadingReactApp';

uiRoutes
  .when('/loading', {
    template,
    controller: class {
      constructor($injector, $scope) {
        const monitoringClusters = $injector.get('monitoringClusters');
        const kbnUrl = $injector.get('kbnUrl');

        initSetupModeState($scope, $injector);

        const setupMode = getSetupModeState();
        // For phase 3, this is not an valid route unless
        // setup mode is currently enabled. For phase 4,
        // we will remove this check.
        if (!setupMode.enabled) {
          kbnUrl.changePath('/no-data');
          return;
        }

        $scope.$on('$destroy', () => {
          unmountComponentAtNode(document.getElementById(REACT_DOM_ID));
        });

        $scope.$$postDigest(() => {
          this.renderReact();
        });

        monitoringClusters(undefined, undefined, [CODE_PATH_LICENSE])
          .then(clusters => {
            if (clusters && clusters.length) {
              kbnUrl.changePath('/home');
              return;
            }
            initSetupModeState($scope, $injector);
            return toggleSetupMode(true)
              .then(() => {
                kbnUrl.changePath('/elasticsearch/nodes');
                $scope.$apply();
              });
          });
      }

      renderReact() {
        render(
          <I18nContext>
            <PageLoading />
          </I18nContext>,
          document.getElementById(REACT_DOM_ID)
        );
      }
    },
  });
