/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { xpackMain } from './plugins/xpack_main';
import { graph } from './plugins/graph';
import { monitoring } from './plugins/monitoring';
import { reporting } from './plugins/reporting';
import { security } from './plugins/security';
import { searchprofiler } from './plugins/searchprofiler';
import { ml } from './plugins/ml';
import { tilemap } from './plugins/tilemap';
import { watcher } from './plugins/watcher';
import { grokdebugger } from './plugins/grokdebugger';
import { dashboardMode } from './plugins/dashboard_mode';
import { logstash } from './plugins/logstash';
import { beats } from './plugins/beats_management';
import { apm } from './plugins/apm';
import { licenseManagement } from './plugins/license_management';
import { cloud } from './plugins/cloud';
import { indexManagement } from './plugins/index_management';
import { consoleExtensions } from './plugins/console_extensions';
import { spaces } from './plugins/spaces';
import { notifications } from './plugins/notifications';
import { kueryAutocomplete } from './plugins/kuery_autocomplete';
import { canvas } from './plugins/canvas';
import { infra } from './plugins/infra';

module.exports = function (kibana) {
  return [
    xpackMain(kibana),
    graph(kibana),
    monitoring(kibana),
    reporting(kibana),
    spaces(kibana),
    security(kibana),
    searchprofiler(kibana),
    ml(kibana),
    tilemap(kibana),
    watcher(kibana),
    grokdebugger(kibana),
    dashboardMode(kibana),
    logstash(kibana),
    beats(kibana),
    apm(kibana),
    canvas(kibana),
    licenseManagement(kibana),
    cloud(kibana),
    indexManagement(kibana),
    consoleExtensions(kibana),
    notifications(kibana),
    kueryAutocomplete(kibana),
    infra(kibana),
  ];
};
