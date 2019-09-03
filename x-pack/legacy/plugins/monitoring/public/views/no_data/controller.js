/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  ClusterSettingsChecker,
  NodeSettingsChecker,
  Enabler,
  startChecks
} from 'plugins/monitoring/lib/elasticsearch_settings';
import { ModelUpdater } from './model_updater';
import { NoData } from 'plugins/monitoring/components';
import { timefilter } from 'ui/timefilter';
import { I18nContext } from 'ui/i18n';
import { CODE_PATH_LICENSE } from '../../../common/constants';
import { MonitoringViewBaseController } from '../base_controller';
import { i18n } from '@kbn/i18n';

export class NoDataController extends MonitoringViewBaseController {

  constructor($injector, $scope) {
    const monitoringClusters = $injector.get('monitoringClusters');
    const kbnUrl = $injector.get('kbnUrl');
    const $http = $injector.get('$http');
    const checkers = [
      new ClusterSettingsChecker($http),
      new NodeSettingsChecker($http)
    ];

    let watcherSet;

    const getData = async () => {
      let catchReason;
      try {
        const monitoringClustersData = await monitoringClusters(undefined, undefined, [CODE_PATH_LICENSE]);
        if (monitoringClustersData && monitoringClustersData.length) {
          kbnUrl.redirect('/home');
          return monitoringClustersData;
        }
      }
      catch (err) {
        if (err && err.status === 503) {
          catchReason = {
            property: 'custom',
            message: err.data.message,
          };
        }
      }

      const { updateModel } = new ModelUpdater($scope, this);
      const enabler = new Enabler($http, updateModel);
      if (!watcherSet) {
        watcherSet = $scope.$watch(() => this, () => this.render(enabler), true);
      }

      if (catchReason) {
        this.reason = catchReason;
      } else if (!this.isCollectionEnabledUpdating
        && !this.isCollectionEnabledUpdated
        && !this.isCollectionIntervalUpdating
        && !this.isCollectionIntervalUpdated) {
        await startChecks(checkers, updateModel);
      }
    };

    super({
      title: i18n.translate('xpack.monitoring.noData.routeTitle', {
        defaultMessage: 'Setup Monitoring'
      }),
      getPageData: async () => await getData(),
      reactNodeId: 'noDataReact',
      $scope,
      $injector
    });

    this.enableTimefilter();
    Object.assign(this, this.getDefaultModel());
  }

  getDefaultModel() {
    return {
      errors: [], // errors can happen from trying to check or set ES settings
      checkMessage: null, // message to show while waiting for api response
      isLoading: true, // flag for in-progress state of checking for no data reason
      isCollectionEnabledUpdating: false, // flags to indicate whether to show a spinner while waiting for ajax
      isCollectionEnabledUpdated: false,
      isCollectionIntervalUpdating: false,
      isCollectionIntervalUpdated: false
    };
  }

  render(enabler) {
    const props = this;
    /**
     * Need to do this because {data} can either be an array or string, because of
     * some race condtions.
     */
    if (typeof props.data !== 'string') {
      props.data = props.reason && props.reason.data || '';
    }
    this.renderReact(
      <I18nContext>
        <NoData {...props} enabler={enabler} />
      </I18nContext>
    );
  }

  enableTimefilter() {
    timefilter.enableTimeRangeSelector();
    timefilter.enableAutoRefreshSelector();
  }

}
