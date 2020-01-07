/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Logstash Node Pipelines Listing
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import uiRoutes from 'ui/routes';
import { ajaxErrorHandlersProvider } from 'plugins/monitoring/lib/ajax_error_handler';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import { isPipelineMonitoringSupportedInVersion } from 'plugins/monitoring/lib/logstash/pipelines';
import template from './index.html';
import { timefilter } from 'ui/timefilter';
import { MonitoringViewBaseEuiTableController } from '../../../';
import { I18nContext } from 'ui/i18n';
import { PipelineListing } from '../../../../components/logstash/pipeline_listing/pipeline_listing';
import { DetailStatus } from '../../../../components/logstash/detail_status';
import { CODE_PATH_LOGSTASH } from '../../../../../common/constants';

const getPageData = ($injector, _api = undefined, routeOptions = {}) => {
  _api; // fixing eslint
  const $route = $injector.get('$route');
  const $http = $injector.get('$http');
  const globalState = $injector.get('globalState');
  const Private = $injector.get('Private');

  const logstashUuid = $route.current.params.uuid;
  const url = `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/logstash/node/${logstashUuid}/pipelines`;
  const timeBounds = timefilter.getBounds();

  return $http
    .post(url, {
      ccs: globalState.ccs,
      timeRange: {
        min: timeBounds.min.toISOString(),
        max: timeBounds.max.toISOString(),
      },
      ...routeOptions,
    })
    .then(response => response.data)
    .catch(err => {
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    });
};

function makeUpgradeMessage(logstashVersion) {
  if (isPipelineMonitoringSupportedInVersion(logstashVersion)) {
    return null;
  }

  return i18n.translate('xpack.monitoring.logstash.node.pipelines.notAvailableDescription', {
    defaultMessage:
      'Pipeline monitoring is only available in Logstash version 6.0.0 or higher. This node is running version {logstashVersion}.',
    values: {
      logstashVersion,
    },
  });
}

uiRoutes.when('/logstash/node/:uuid/pipelines', {
  template,
  resolve: {
    clusters(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_LOGSTASH] });
    },
  },
  controller: class extends MonitoringViewBaseEuiTableController {
    constructor($injector, $scope) {
      const kbnUrl = $injector.get('kbnUrl');
      const config = $injector.get('config');

      super({
        defaultData: {},
        getPageData,
        reactNodeId: 'monitoringLogstashNodePipelinesApp',
        $scope,
        $injector,
        fetchDataImmediately: false, // We want to apply pagination before sending the first request
      });

      $scope.$watch(
        () => this.data,
        data => {
          if (!data || !data.nodeSummary) {
            return;
          }

          this.setTitle(
            i18n.translate('xpack.monitoring.logstash.node.pipelines.routeTitle', {
              defaultMessage: 'Logstash - {nodeName} - Pipelines',
              values: {
                nodeName: data.nodeSummary.name,
              },
            })
          );

          const pagination = {
            ...this.pagination,
            totalItemCount: data.totalPipelineCount,
          };

          this.renderReact(
            <I18nContext>
              <PipelineListing
                className="monitoringLogstashPipelinesTable"
                onBrush={this.onBrush}
                zoomInfo={this.zoomInfo}
                stats={data.nodeSummary}
                statusComponent={DetailStatus}
                data={data.pipelines}
                {...this.getPaginationTableProps(pagination)}
                dateFormat={config.get('dateFormat')}
                upgradeMessage={makeUpgradeMessage(data.nodeSummary.version, i18n)}
                angular={{
                  kbnUrl,
                  scope: $scope,
                }}
              />
            </I18nContext>
          );
        }
      );
    }
  },
});
