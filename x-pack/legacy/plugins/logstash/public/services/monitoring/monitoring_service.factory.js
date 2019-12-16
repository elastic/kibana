/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { MonitoringService } from './monitoring_service';
import '../cluster';

uiModules.get('xpack/logstash').factory('xpackLogstashMonitoringService', $injector => {
  const $http = $injector.get('$http');
  const Promise = $injector.get('Promise');
  const monitoringUiEnabled =
    $injector.has('monitoringUiEnabled') && $injector.get('monitoringUiEnabled');
  const clusterService = $injector.get('xpackLogstashClusterService');
  return new MonitoringService($http, Promise, monitoringUiEnabled, clusterService);
});
