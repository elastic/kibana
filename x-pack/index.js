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
import { gis } from './plugins/gis';
import { licenseManagement } from './plugins/license_management';
import { cloud } from './plugins/cloud';
import { indexManagement } from './plugins/index_management';
import { indexLifecycleManagement } from './plugins/index_lifecycle_management';
import { consoleExtensions } from './plugins/console_extensions';
import { spaces } from './plugins/spaces';
import { notifications } from './plugins/notifications';
import { kueryAutocomplete } from './plugins/kuery_autocomplete';
import { canvas } from './plugins/canvas';
import { infra } from './plugins/infra';
import { taskManager } from './plugins/task_manager';
import { rollup } from './plugins/rollup';
import { remoteClusters } from './plugins/remote_clusters';
import { crossClusterReplication } from './plugins/cross_cluster_replication';
import { translations } from './plugins/translations';
import { upgradeAssistant } from './plugins/upgrade_assistant';
import { uptime } from './plugins/uptime';

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
    gis(kibana),
    canvas(kibana),
    licenseManagement(kibana),
    cloud(kibana),
    indexManagement(kibana),
    consoleExtensions(kibana),
    notifications(kibana),
    indexLifecycleManagement(kibana),
    kueryAutocomplete(kibana),
    infra(kibana),
    taskManager(kibana),
    rollup(kibana),
    remoteClusters(kibana),
    crossClusterReplication(kibana),
    translations(kibana),
    upgradeAssistant(kibana),
    uptime(kibana),
  ];
};
