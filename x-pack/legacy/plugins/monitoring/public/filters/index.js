/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { capitalize } from 'lodash';
import { uiModules } from 'plugins/monitoring/np_imports/ui/modules';
import { formatNumber, formatMetric } from 'plugins/monitoring/lib/format_number';
import { extractIp } from 'plugins/monitoring/lib/extract_ip';

const uiModule = uiModules.get('monitoring/filters', []);

uiModule.filter('capitalize', function() {
  return function(input) {
    return capitalize(input.toLowerCase());
  };
});

uiModule.filter('formatNumber', function() {
  return formatNumber;
});

uiModule.filter('formatMetric', function() {
  return formatMetric;
});

uiModule.filter('extractIp', function() {
  return extractIp;
});
