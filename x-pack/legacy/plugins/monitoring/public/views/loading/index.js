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
import { AppStateProvider } from 'ui/state_management/app_state';

const REACT_DOM_ID = 'monitoringLoadingReactApp';

uiRoutes
  .when('/loading', {
    template,
    controller: class {
      constructor($injector, $scope) {
        const monitoringClusters = $injector.get('monitoringClusters');
        const kbnUrl = $injector.get('kbnUrl');

        initSetupModeState($scope, $injector);

        $scope.$on('$destroy', () => {
          unmountComponentAtNode(document.getElementById(REACT_DOM_ID));
        });

        $scope.$$postDigest(() => {
          this.renderReact();
        });

        monitoringClusters(undefined, undefined, [CODE_PATH_LICENSE])
          .then(clusters => {
            const setupMode = getSetupModeState();
            // For phase 3, this is not an valid route unless
            // setup mode is currently enabled. For phase 4,
            // we will remove this check.
            if (!setupMode.enabled) {
              if (clusters && clusters.length) {
                if (clusters.length === 1) {
                  kbnUrl.changePath('/overview');
                } else {
                  kbnUrl.changePath('/home');
                }
              } else {
                kbnUrl.changePath('/no-data');
              }
              return;
            }
            toggleSetupMode(true)
              .then(() => {
                kbnUrl.changePath('/elasticsearch/nodes');
                $scope.$apply();
              });
          }).catch((error) => {
            const Private = $injector.get('Private');
            const AppState = Private(AppStateProvider);
            kbnUrl.changePath('/no-data', null, new AppState({ error: error && error.data }));
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
