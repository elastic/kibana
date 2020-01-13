/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { isEmpty } from 'lodash';
import chrome from 'ui/chrome';
import { i18n } from '@kbn/i18n';
import uiRoutes from 'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import template from './index.html';
import { MonitoringViewBaseController } from '../../';
import { Overview } from 'plugins/monitoring/components/cluster/overview';
import { I18nContext } from 'ui/i18n';
import { SetupModeRenderer } from '../../../components/renderers';
import {
  CODE_PATH_ALL,
  MONITORING_CONFIG_SAVED_OBJECT_ID,
  MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS,
} from '../../../../common/constants';

const CODE_PATHS = [CODE_PATH_ALL];

uiRoutes.when('/overview', {
  template,
  resolve: {
    clusters(Private) {
      // checks license info of all monitored clusters for multi-cluster monitoring usage and capability
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: CODE_PATHS });
    },
  },
  controller: class extends MonitoringViewBaseController {
    constructor($injector, $scope) {
      const kbnUrl = $injector.get('kbnUrl');
      const monitoringClusters = $injector.get('monitoringClusters');
      const globalState = $injector.get('globalState');
      const showLicenseExpiration = $injector.get('showLicenseExpiration');
      const savedObjectsClient = chrome.getSavedObjectsClient();

      super({
        title: i18n.translate('xpack.monitoring.cluster.overviewTitle', {
          defaultMessage: 'Overview',
        }),
        defaultData: {},
        getPageData: async () => {
          const clusters = await monitoringClusters(
            globalState.cluster_uuid,
            globalState.ccs,
            CODE_PATHS
          );
          return clusters[0];
        },
        reactNodeId: 'monitoringClusterOverviewApp',
        $scope,
        $injector,
      });

      const changeUrl = target => {
        $scope.$evalAsync(() => {
          kbnUrl.changePath(target);
        });
      };

      $scope.$watch(
        () => this.data,
        async data => {
          if (isEmpty(data)) {
            return;
          }

          const monitoringConfig = await savedObjectsClient.get(
            'config',
            MONITORING_CONFIG_SAVED_OBJECT_ID
          );
          const emailAddress =
            monitoringConfig.get(MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS) ||
            chrome.getInjected('monitoringLegacyEmailAddress') ||
            '';

          this.renderReact(
            <I18nContext>
              <SetupModeRenderer
                scope={$scope}
                injector={$injector}
                render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
                  <Fragment>
                    {flyoutComponent}
                    <Overview
                      cluster={data}
                      emailAddress={emailAddress}
                      setupMode={setupMode}
                      changeUrl={changeUrl}
                      showLicenseExpiration={showLicenseExpiration}
                    />
                    {bottomBarComponent}
                  </Fragment>
                )}
              />
            </I18nContext>
          );
        }
      );
    }
  },
});
