/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Logstash Node
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import uiRoutes from 'plugins/monitoring/np_imports/ui/routes';
import { ajaxErrorHandlersProvider } from 'plugins/monitoring/lib/ajax_error_handler';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import template from './index.html';
import { timefilter } from 'plugins/monitoring/np_imports/ui/timefilter';
import { DetailStatus } from 'plugins/monitoring/components/logstash/detail_status';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPanel,
  EuiSpacer,
  EuiFlexGrid,
  EuiFlexItem,
} from '@elastic/eui';
import { MonitoringTimeseriesContainer } from '../../../components/chart';
import { I18nContext } from 'ui/i18n';
import { MonitoringViewBaseController } from '../../base_controller';
import { CODE_PATH_LOGSTASH } from '../../../../common/constants';

function getPageData($injector) {
  const $http = $injector.get('$http');
  const $route = $injector.get('$route');
  const globalState = $injector.get('globalState');
  const url = `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/logstash/node/${$route.current.params.uuid}`;
  const timeBounds = timefilter.getBounds();

  return $http
    .post(url, {
      ccs: globalState.ccs,
      timeRange: {
        min: timeBounds.min.toISOString(),
        max: timeBounds.max.toISOString(),
      },
      is_advanced: false,
    })
    .then(response => response.data)
    .catch(err => {
      const Private = $injector.get('Private');
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    });
}

uiRoutes.when('/logstash/node/:uuid', {
  template,
  resolve: {
    clusters(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_LOGSTASH] });
    },
    pageData: getPageData,
  },
  controller: class extends MonitoringViewBaseController {
    constructor($injector, $scope) {
      super({
        defaultData: {},
        getPageData,
        reactNodeId: 'monitoringLogstashNodeApp',
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
            i18n.translate('xpack.monitoring.logstash.node.routeTitle', {
              defaultMessage: 'Logstash - {nodeName}',
              values: {
                nodeName: data.nodeSummary.name,
              },
            })
          );

          const metricsToShow = [
            data.metrics.logstash_events_input_rate,
            data.metrics.logstash_jvm_usage,
            data.metrics.logstash_events_output_rate,
            data.metrics.logstash_node_cpu_metric,
            data.metrics.logstash_events_latency,
            data.metrics.logstash_os_load,
          ];

          this.renderReact(
            <I18nContext>
              <EuiPage>
                <EuiPageBody>
                  <EuiPanel>
                    <DetailStatus stats={data.nodeSummary} />
                  </EuiPanel>
                  <EuiSpacer size="m" />
                  <EuiPageContent>
                    <EuiFlexGrid columns={2} gutterSize="s">
                      {metricsToShow.map((metric, index) => (
                        <EuiFlexItem key={index}>
                          <MonitoringTimeseriesContainer
                            series={metric}
                            onBrush={this.onBrush}
                            zoomInfo={this.zoomInfo}
                            {...data}
                          />
                          <EuiSpacer />
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGrid>
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
