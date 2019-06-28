/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { find } from 'lodash';
import uiRoutes from'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import template from './index.html';
import { ApmServerInstances } from '../../../components/apm/instances';
import { MonitoringViewBaseEuiTableController } from '../..';
import { I18nContext } from 'ui/i18n';

uiRoutes.when('/apm/instances', {
  template,
  resolve: {
    clusters: function (Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit();
    },
  },
  controller: class extends MonitoringViewBaseEuiTableController {
    constructor($injector, $scope) {
      const $route = $injector.get('$route');
      const globalState = $injector.get('globalState');
      $scope.cluster = find($route.current.locals.clusters, {
        cluster_uuid: globalState.cluster_uuid
      });

      super({
        title: i18n.translate('xpack.monitoring.apm.instances.routeTitle', {
          defaultMessage: '{apm} - Instances',
          values: {
            apm: 'APM'
          }
        }),
        storageKey: 'apm.instances',
        api: `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/apm/instances`,
        defaultData: {},
        reactNodeId: 'apmInstancesReact',
        $scope,
        $injector
      });

      $scope.$watch(() => this.data, data => {
        this.renderReact(data);
      });
    }

    renderReact(data) {
      const {
        pagination,
        sorting,
        onTableChange,
      } = this;

      const component = (
        <I18nContext>
          <ApmServerInstances
            apms={{
              pagination,
              sorting,
              onTableChange,
              data,
            }}
          />
        </I18nContext>
      );
      super.renderReact(component);
    }
  }
});
