/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import 'ui/url';
import { LogstashLicenseService } from './logstash_license_service';

uiModules.get('xpack/logstash').factory('logstashLicenseService', ($timeout, kbnUrl) => {
  return new LogstashLicenseService(xpackInfo, kbnUrl, $timeout);
});
