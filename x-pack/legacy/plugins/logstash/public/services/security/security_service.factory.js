/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { logstashSecurityService } from './logstash_security_service';

uiModules.get('xpack/logstash')
// todo - access directly from logstash service
// only consumed by pipeline edit
  .factory('logstashSecurityService', () => logstashSecurityService);
