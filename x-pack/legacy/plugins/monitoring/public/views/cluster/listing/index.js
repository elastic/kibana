/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import uiRoutes from 'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import { MonitoringViewBaseEuiTableController } from '../../';
import { I18nContext } from 'ui/i18n';
import template from './index.html';
import { Listing } from '../../../components/cluster/listing';
import { CODE_PATH_ALL } from '../../../../common/constants';

const CODE_PATHS = [CODE_PATH_ALL];

const getPageData = $injector => {
  const monitoringClusters = $injector.get('monitoringClusters');
  return monitoringClusters(undefined, undefined, CODE_PATHS);
};

uiRoutes
  .when('/home', {
    template,
    resolve: {
      clusters: (Private, kbnUrl) => {
        const routeInit = Private(routeInitProvider);
        return routeInit({ codePaths: CODE_PATHS, fetchAllClusters: true }).then(clusters => {
          if (!clusters || !clusters.length) {
            kbnUrl.changePath('/no-data');
            return Promise.reject();
          }
          if (clusters.length === 1) {
            // Bypass the cluster listing if there is just 1 cluster
            kbnUrl.changePath('/overview');
            return Promise.reject();
          }
          return clusters;
        });
      },
    },
    controllerAs: 'clusters',
    controller: class ClustersList extends MonitoringViewBaseEuiTableController {
      constructor($injector, $scope) {
        super({
          storageKey: 'clusters',
          getPageData,
          $scope,
          $injector,
          reactNodeId: 'monitoringClusterListingApp',
        });

        const $route = $injector.get('$route');
        const kbnUrl = $injector.get('kbnUrl');
        const globalState = $injector.get('globalState');
        const storage = $injector.get('localStorage');
        const showLicenseExpiration = $injector.get('showLicenseExpiration');
        this.data = $route.current.locals.clusters;

        $scope.$watch(
          () => this.data,
          data => {
            this.renderReact(
              <I18nContext>
                <Listing
                  clusters={data}
                  angular={{
                    scope: $scope,
                    globalState,
                    kbnUrl,
                    storage,
                    showLicenseExpiration,
                  }}
                  sorting={this.sorting}
                  pagination={this.pagination}
                  onTableChange={this.onTableChange}
                />
              </I18nContext>
            );
          }
        );
      }
    },
  })
  .otherwise({ redirectTo: '/no-data' });
