/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { find } from 'lodash';
import uiRoutes from 'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import template from './index.html';
import { MonitoringViewBaseController } from '../../base_controller';
import { ApmOverview } from '../../../components/apm/overview';
import { I18nContext } from 'ui/i18n';
import { CODE_PATH_APM } from '../../../../common/constants';

uiRoutes.when('/apm', {
  template,
  resolve: {
    clusters: function(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_APM] });
    },
  },
  controller: class extends MonitoringViewBaseController {
    constructor($injector, $scope) {
      const $route = $injector.get('$route');
      const globalState = $injector.get('globalState');
      $scope.cluster = find($route.current.locals.clusters, {
        cluster_uuid: globalState.cluster_uuid,
      });

      super({
        title: 'APM',
        api: `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/apm`,
        defaultData: {},
        reactNodeId: 'apmOverviewReact',
        $scope,
        $injector,
      });

      $scope.$watch(
        () => this.data,
        data => {
          this.renderReact(data);
        }
      );
    }

    renderReact(data) {
      const component = (
        <I18nContext>
          <ApmOverview {...data} onBrush={this.onBrush} zoomInfo={this.zoomInfo} />
        </I18nContext>
      );
      super.renderReact(component);
    }
  },
});
