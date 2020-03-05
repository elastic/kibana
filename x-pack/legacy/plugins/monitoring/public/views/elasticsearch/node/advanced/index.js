/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Controller for Advanced Node Detail
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import uiRoutes from 'plugins/monitoring/np_imports/ui/routes';
import { ajaxErrorHandlersProvider } from 'plugins/monitoring/lib/ajax_error_handler';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import template from './index.html';
import { timefilter } from 'plugins/monitoring/np_imports/ui/timefilter';
import { I18nContext } from 'ui/i18n';
import { AdvancedNode } from '../../../../components/elasticsearch/node/advanced';
import { MonitoringViewBaseController } from '../../../base_controller';
import { CODE_PATH_ELASTICSEARCH } from '../../../../../common/constants';

function getPageData($injector) {
  const $http = $injector.get('$http');
  const globalState = $injector.get('globalState');
  const $route = $injector.get('$route');
  const timeBounds = timefilter.getBounds();
  const url = `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/elasticsearch/nodes/${$route.current.params.node}`;

  return $http
    .post(url, {
      ccs: globalState.ccs,
      timeRange: {
        min: timeBounds.min.toISOString(),
        max: timeBounds.max.toISOString(),
      },
      is_advanced: true,
    })
    .then(response => response.data)
    .catch(err => {
      const Private = $injector.get('Private');
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    });
}

uiRoutes.when('/elasticsearch/nodes/:node/advanced', {
  template,
  resolve: {
    clusters: function(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_ELASTICSEARCH] });
    },
    pageData: getPageData,
  },
  controller: class extends MonitoringViewBaseController {
    constructor($injector, $scope) {
      super({
        defaultData: {},
        getPageData,
        reactNodeId: 'monitoringElasticsearchAdvancedNodeApp',
        $scope,
        $injector,
      });

      $scope.$watch(
        () => this.data,
        data => {
          if (!data || !data.nodeSummary) {
            return;
          }

          this.setTitle(
            i18n.translate('xpack.monitoring.elasticsearch.node.advanced.routeTitle', {
              defaultMessage: 'Elasticsearch - Nodes - {nodeSummaryName} - Advanced',
              values: {
                nodeSummaryName: data.nodeSummary.name,
              },
            })
          );

          this.renderReact(
            <I18nContext>
              <AdvancedNode
                nodeSummary={data.nodeSummary}
                metrics={data.metrics}
                onBrush={this.onBrush}
                zoomInfo={this.zoomInfo}
              />
            </I18nContext>
          );
        }
      );
    }
  },
});
