/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { uiModules } from 'plugins/monitoring/np_imports/ui/modules';

const uiModule = uiModules.get('monitoring/features', []);
uiModule.service('features', function($window) {
  function getData() {
    let returnData = {};
    const monitoringData = $window.localStorage.getItem('xpack.monitoring.data');

    try {
      returnData = (monitoringData && JSON.parse(monitoringData)) || {};
    } catch (e) {
      console.error('Monitoring UI: error parsing locally stored monitoring data', e);
    }

    return returnData;
  }

  function update(featureName, value) {
    const monitoringDataObj = getData();
    monitoringDataObj[featureName] = value;
    $window.localStorage.setItem('xpack.monitoring.data', JSON.stringify(monitoringDataObj));
  }

  function isEnabled(featureName, defaultSetting) {
    const monitoringDataObj = getData();
    if (_.has(monitoringDataObj, featureName)) {
      return monitoringDataObj[featureName];
    }

    if (_.isUndefined(defaultSetting)) {
      return false;
    }

    return defaultSetting;
  }

  return {
    isEnabled,
    update,
  };
});
