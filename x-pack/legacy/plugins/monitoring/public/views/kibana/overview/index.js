/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Kibana Overview
 */
import React from 'react';
import uiRoutes from 'ui/routes';
import { MonitoringTimeseriesContainer } from '../../../components/chart';
import { ajaxErrorHandlersProvider } from 'plugins/monitoring/lib/ajax_error_handler';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import template from './index.html';
import { timefilter } from 'ui/timefilter';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPanel,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { ClusterStatus } from '../../../components/kibana/cluster_status';
import { I18nContext } from 'ui/i18n';
import { MonitoringViewBaseController } from '../../base_controller';
import { CODE_PATH_KIBANA } from '../../../../common/constants';

function getPageData($injector) {
  const $http = $injector.get('$http');
  const globalState = $injector.get('globalState');
  const url = `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/kibana`;
  const timeBounds = timefilter.getBounds();

  return $http
    .post(url, {
      ccs: globalState.ccs,
      timeRange: {
        min: timeBounds.min.toISOString(),
        max: timeBounds.max.toISOString(),
      },
    })
    .then(response => response.data)
    .catch(err => {
      const Private = $injector.get('Private');
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    });
}

uiRoutes.when('/kibana', {
  template,
  resolve: {
    clusters: function(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_KIBANA] });
    },
    pageData: getPageData,
  },
  controllerAs: 'monitoringKibanaOverviewApp',
  controller: class extends MonitoringViewBaseController {
    constructor($injector, $scope) {
      super({
        title: `Kibana`,
        defaultData: {},
        getPageData,
        reactNodeId: 'monitoringKibanaOverviewApp',
        $scope,
        $injector,
      });

      $scope.$watch(
        () => this.data,
        data => {
          if (!data || !data.clusterStatus) {
            return;
          }

          this.renderReact(
            <I18nContext>
              <EuiPage>
                <EuiPageBody>
                  <EuiPanel>
                    <ClusterStatus stats={data.clusterStatus} />
                  </EuiPanel>
                  <EuiSpacer size="m" />
                  <EuiPageContent>
                    <EuiFlexGroup>
                      <EuiFlexItem grow={true}>
                        <MonitoringTimeseriesContainer
                          series={data.metrics.kibana_cluster_requests}
                          onBrush={this.onBrush}
                          zoomInfo={this.zoomInfo}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={true}>
                        <MonitoringTimeseriesContainer
                          series={data.metrics.kibana_cluster_response_times}
                          onBrush={this.onBrush}
                          zoomInfo={this.zoomInfo}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPageContent>
                </EuiPageBody>
              </EuiPage>
            </I18nContext>
          );
        }
      );
    }
  },
});
