/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { render } from 'react-dom';
import { find, get } from 'lodash';
import uiRoutes from 'plugins/monitoring/np_imports/ui/routes';
import template from './index.html';
import { ajaxErrorHandlersProvider } from 'plugins/monitoring/lib/ajax_error_handler';
import { I18nContext } from 'ui/i18n';
import { timefilter } from 'plugins/monitoring/np_imports/ui/timefilter';
import { Alert } from '../../components/alert';
import { MonitoringViewBaseEuiTableController } from '../base_eui_table_controller';
import { EuiPage, EuiPageBody, EuiPageContent } from '@elastic/eui';

function getPageData($injector) {
  const $route = $injector.get('$route');
  const globalState = $injector.get('globalState');
  const $http = $injector.get('$http');
  const Private = $injector.get('Private');
  const url = `../api/monitoring/v1/alert/${$route.current.params.id}`;

  const timeBounds = timefilter.getBounds();
  const data = {
    ccs: globalState.ccs,
    timeRange: {
      min: timeBounds.min.toISOString(),
      max: timeBounds.max.toISOString(),
    },
  };

  return $http
    .post(url, data)
    .then(response => get(response, 'data', {}))
    .catch(err => {
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    });
}

uiRoutes.when('/alert/:id', {
  template,
  resolve: {
    alertState: getPageData,
  },
  controllerAs: 'alert',
  controller: class AlertView extends MonitoringViewBaseEuiTableController {
    constructor($injector, $scope) {
      const $route = $injector.get('$route');
      const globalState = $injector.get('globalState');
      const config = $injector.get('config');
      const alertId = $route.current.params.id;

      // breadcrumbs + page title
      $scope.cluster = find($route.current.locals.clusters, {
        cluster_uuid: globalState.cluster_uuid,
      });

      super({
        title: i18n.translate('xpack.monitoring.alerts.clusterAlertTitle', {
          defaultMessage: 'Cluster Alert - {alertId}',
          values: {
            alertId,
          },
        }),
        getPageData,
        $scope,
        $injector,
        reactNodeId: 'monitoringAlertApp',
        options: {
          enableTimeFilter: false,
        },
      });

      this.data = $route.current.locals.alertState;

      const renderReact = data => {
        const app = <Alert alertState={data} uiSettings={config} refresh={this.updateData} />;

        render(
          <I18nContext>
            <EuiPage>
              <EuiPageBody>
                <EuiPageContent>{app}</EuiPageContent>
              </EuiPageBody>
            </EuiPage>
          </I18nContext>,
          document.getElementById('monitoringAlertApp')
        );
      };
      $scope.$watch(
        () => this.data,
        data => renderReact(data)
      );
    }
  },
});
