/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { find } from 'lodash';
import uiRoutes from 'ui/routes';
import { timefilter } from 'ui/timefilter';
import template from './index.html';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import { MonitoringViewBaseEuiTableController } from '../../';
import { ElasticsearchNodes } from '../../../components';
import { I18nContext } from 'ui/i18n';
import { getClusterFromClusters } from '../../../lib/get_cluster_from_clusters';
import { ajaxErrorHandlersProvider } from '../../../lib/ajax_error_handler';
import { SetupModeRenderer } from '../../../components/renderers';
import { getSetupModeState } from '../../../lib/setup_mode';

uiRoutes.when('/elasticsearch/nodes', {
  template,
  resolve: {
    clusters(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit();
    }
  },
  controllerAs: 'elasticsearchNodes',
  controller: class ElasticsearchNodesController extends MonitoringViewBaseEuiTableController {
    constructor($injector, $scope, monitoringClusters) {
      const $route = $injector.get('$route');
      const globalState = $injector.get('globalState');
      const showCgroupMetricsElasticsearch = $injector.get('showCgroupMetricsElasticsearch');

      $scope.cluster = find($route.current.locals.clusters, {
        cluster_uuid: globalState.cluster_uuid
      }) || {};

      const getPageData = ($injector) => {
        const $http = $injector.get('$http');
        const globalState = $injector.get('globalState');
        const timeBounds = timefilter.getBounds();

        const setupMode = getSetupModeState();

        const getNodes = (clusterUuid = globalState.cluster_uuid) => $http
          .post(`../api/monitoring/v1/clusters/${clusterUuid}/elasticsearch/nodes`, {
            ccs: globalState.ccs,
            timeRange: {
              min: timeBounds.min.toISOString(),
              max: timeBounds.max.toISOString()
            }
          });

        let promise = null;
        if (setupMode.enabled && !globalState.cluster_uuid) {
          promise = monitoringClusters()
            .then(clusters => {
              if (!clusters || !clusters.length) {
                return $http.get(`../api/monitoring/v1/live/elasticsearch/nodes`);
              }
              const cluster = getClusterFromClusters(clusters, globalState);
              return getNodes(cluster.cluster_uuid);
            });
        }
        else if (!globalState.cluster_uuid) {
          return new Promise(resolve => resolve(null));
        }
        else {
          promise = getNodes();
        }

        return promise
          .then(response => response.data)
          .catch(err => {
            const Private = $injector.get('Private');
            const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
            return ajaxErrorHandlers(err);
          });
      };

      super({
        title: i18n.translate('xpack.monitoring.elasticsearch.nodes.routeTitle', {
          defaultMessage: 'Elasticsearch - Nodes'
        }),
        storageKey: 'elasticsearch.nodes',
        reactNodeId: 'elasticsearchNodesReact',
        defaultData: {},
        getPageData,
        $scope,
        $injector
      });

      this.isCcrEnabled = $scope.cluster.isCcrEnabled;

      $scope.$watch(() => this.data, data => {
        this.renderReact(data);
      });

      this.renderReact = ({ clusterStatus, nodes }) => {
        super.renderReact(
          <I18nContext>
            <SetupModeRenderer
              scope={$scope}
              injector={$injector}
              productName="elasticsearch"
              render={({ setupMode, flyoutComponent }) => (
                <Fragment>
                  {flyoutComponent}
                  <ElasticsearchNodes
                    clusterStatus={clusterStatus}
                    setupMode={setupMode}
                    nodes={nodes}
                    showCgroupMetricsElasticsearch={showCgroupMetricsElasticsearch}
                    sorting={this.sorting}
                    pagination={this.pagination}
                    onTableChange={this.onTableChange}
                  />
                </Fragment>
              )}
            />
          </I18nContext>
        );
      };
    }
  }
});
