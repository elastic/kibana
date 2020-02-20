/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { PipelineService } from './pipeline_service';

uiModules.get('xpack/logstash').factory('pipelineService', $injector => {
  const $http = $injector.get('$http');
  const pipelinesService = $injector.get('pipelinesService');
  return new PipelineService($http, pipelinesService);
});
