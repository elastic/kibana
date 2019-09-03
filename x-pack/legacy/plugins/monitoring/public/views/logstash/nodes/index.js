/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import uiRoutes from'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import { MonitoringViewBaseEuiTableController } from '../../';
import { getPageData } from './get_page_data';
import template from './index.html';
import { I18nContext } from 'ui/i18n';
import { Listing } from '../../../components/logstash/listing';
import { SetupModeRenderer } from '../../../components/renderers';
import { LOGSTASH_SYSTEM_ID } from '../../../../../telemetry/common/constants';
import { CODE_PATH_LOGSTASH } from '../../../../common/constants';

uiRoutes.when('/logstash/nodes', {
  template,
  resolve: {
    clusters(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_LOGSTASH] });
    },
    pageData: getPageData
  },
  controllerAs: 'lsNodes',
  controller: class LsNodesList extends MonitoringViewBaseEuiTableController {

    constructor($injector, $scope) {
      const kbnUrl = $injector.get('kbnUrl');

      super({
        title: 'Logstash - Nodes',
        storageKey: 'logstash.nodes',
        getPageData,
        reactNodeId: 'monitoringLogstashNodesApp',
        $scope,
        $injector
      });

      $scope.$watch(() => this.data, data => {
        this.renderReact(
          <I18nContext>
            <SetupModeRenderer
              scope={$scope}
              injector={$injector}
              productName={LOGSTASH_SYSTEM_ID}
              render={({ setupMode, flyoutComponent }) => (
                <Fragment>
                  {flyoutComponent}
                  <Listing
                    data={data.nodes}
                    setupMode={setupMode}
                    stats={data.clusterStatus}
                    sorting={this.sorting}
                    pagination={this.pagination}
                    onTableChange={this.onTableChange}
                    angular={{ kbnUrl, scope: $scope }}
                  />
                </Fragment>
              )}
            />

          </I18nContext>
        );
      });
    }
  }
});
