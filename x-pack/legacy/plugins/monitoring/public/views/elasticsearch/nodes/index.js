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
import { ajaxErrorHandlersProvider } from '../../../lib/ajax_error_handler';
import { SetupModeRenderer } from '../../../components/renderers';
import { ELASTICSEARCH_SYSTEM_ID, CODE_PATH_ELASTICSEARCH } from '../../../../common/constants';

uiRoutes.when('/elasticsearch/nodes', {
  template,
  resolve: {
    clusters(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_ELASTICSEARCH] });
    },
  },
  controllerAs: 'elasticsearchNodes',
  controller: class ElasticsearchNodesController extends MonitoringViewBaseEuiTableController {
    constructor($injector, $scope) {
      const $route = $injector.get('$route');
      const globalState = $injector.get('globalState');
      const showCgroupMetricsElasticsearch = $injector.get('showCgroupMetricsElasticsearch');

      $scope.cluster =
        find($route.current.locals.clusters, {
          cluster_uuid: globalState.cluster_uuid,
        }) || {};

      const getPageData = ($injector, _api = undefined, routeOptions = {}) => {
        const $http = $injector.get('$http');
        const globalState = $injector.get('globalState');
        const timeBounds = timefilter.getBounds();

        const getNodes = (clusterUuid = globalState.cluster_uuid) =>
          $http.post(`../api/monitoring/v1/clusters/${clusterUuid}/elasticsearch/nodes`, {
            ccs: globalState.ccs,
            timeRange: {
              min: timeBounds.min.toISOString(),
              max: timeBounds.max.toISOString(),
            },
            ...routeOptions,
          });

        const promise = globalState.cluster_uuid ? getNodes() : new Promise(resolve => resolve({}));
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
          defaultMessage: 'Elasticsearch - Nodes',
        }),
        storageKey: 'elasticsearch.nodes',
        reactNodeId: 'elasticsearchNodesReact',
        defaultData: {},
        getPageData,
        $scope,
        $injector,
        fetchDataImmediately: false, // We want to apply pagination before sending the first request
      });

      this.isCcrEnabled = $scope.cluster.isCcrEnabled;

      $scope.$watch(
        () => this.data,
        () => this.renderReact(this.data || {})
      );

      this.renderReact = ({ clusterStatus, nodes, totalNodeCount }) => {
        const pagination = {
          ...this.pagination,
          totalItemCount: totalNodeCount,
        };

        super.renderReact(
          <I18nContext>
            <SetupModeRenderer
              scope={$scope}
              injector={$injector}
              productName={ELASTICSEARCH_SYSTEM_ID}
              render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
                <Fragment>
                  {flyoutComponent}
                  <ElasticsearchNodes
                    clusterStatus={clusterStatus}
                    clusterUuid={globalState.cluster_uuid}
                    setupMode={setupMode}
                    nodes={nodes}
                    showCgroupMetricsElasticsearch={showCgroupMetricsElasticsearch}
                    {...this.getPaginationTableProps(pagination)}
                  />
                  {bottomBarComponent}
                </Fragment>
              )}
            />
          </I18nContext>
        );
      };
    }
  },
});
