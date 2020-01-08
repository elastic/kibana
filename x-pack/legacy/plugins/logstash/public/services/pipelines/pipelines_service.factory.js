/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { PipelinesService } from './pipelines_service';
import '../monitoring';

uiModules.get('xpack/logstash').factory('pipelinesService', $injector => {
  const $http = $injector.get('$http');
  const $window = $injector.get('$window');
  const Promise = $injector.get('Promise');
  const monitoringService = $injector.get('xpackLogstashMonitoringService');
  return new PipelinesService($http, $window, Promise, monitoringService);
});
