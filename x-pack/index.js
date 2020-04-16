/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { xpackMain } from './legacy/plugins/xpack_main';
import { graph } from './legacy/plugins/graph';
import { monitoring } from './legacy/plugins/monitoring';
import { reporting } from './legacy/plugins/reporting';
import { security } from './legacy/plugins/security';
import { tilemap } from './legacy/plugins/tilemap';
import { dashboardMode } from './legacy/plugins/dashboard_mode';
import { logstash } from './legacy/plugins/logstash';
import { beats } from './legacy/plugins/beats_management';
import { apm } from './legacy/plugins/apm';
import { maps } from './legacy/plugins/maps';
import { indexManagement } from './legacy/plugins/index_management';
import { spaces } from './legacy/plugins/spaces';
import { canvas } from './legacy/plugins/canvas';
import { infra } from './legacy/plugins/infra';
import { taskManager } from './legacy/plugins/task_manager';
import { rollup } from './legacy/plugins/rollup';
import { siem } from './legacy/plugins/siem';
import { remoteClusters } from './legacy/plugins/remote_clusters';
import { crossClusterReplication } from './legacy/plugins/cross_cluster_replication';
import { upgradeAssistant } from './legacy/plugins/upgrade_assistant';
import { uptime } from './legacy/plugins/uptime';
import { encryptedSavedObjects } from './legacy/plugins/encrypted_saved_objects';
import { actions } from './legacy/plugins/actions';
import { alerting } from './legacy/plugins/alerting';
import { ingestManager } from './legacy/plugins/ingest_manager';
import { triggersActionsUI } from './legacy/plugins/triggers_actions_ui';

module.exports = function(kibana) {
  return [
    xpackMain(kibana),
    graph(kibana),
    monitoring(kibana),
    reporting(kibana),
    spaces(kibana),
    security(kibana),
    tilemap(kibana),
    dashboardMode(kibana),
    logstash(kibana),
    beats(kibana),
    apm(kibana),
    maps(kibana),
    canvas(kibana),
    indexManagement(kibana),
    infra(kibana),
    taskManager(kibana),
    rollup(kibana),
    siem(kibana),
    remoteClusters(kibana),
    crossClusterReplication(kibana),
    upgradeAssistant(kibana),
    uptime(kibana),
    encryptedSavedObjects(kibana),
    actions(kibana),
    alerting(kibana),
    ingestManager(kibana),
    triggersActionsUI(kibana),
  ];
};
