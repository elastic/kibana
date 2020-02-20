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
import { ml } from './legacy/plugins/ml';
import { tilemap } from './legacy/plugins/tilemap';
import { grokdebugger } from './legacy/plugins/grokdebugger';
import { dashboardMode } from './legacy/plugins/dashboard_mode';
import { logstash } from './legacy/plugins/logstash';
import { beats } from './legacy/plugins/beats_management';
import { apm } from './legacy/plugins/apm';
import { maps } from './legacy/plugins/maps';
import { licenseManagement } from './legacy/plugins/license_management';
import { indexManagement } from './legacy/plugins/index_management';
import { indexLifecycleManagement } from './legacy/plugins/index_lifecycle_management';
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
import { fileUpload } from './legacy/plugins/file_upload';
import { encryptedSavedObjects } from './legacy/plugins/encrypted_saved_objects';
import { snapshotRestore } from './legacy/plugins/snapshot_restore';
import { transform } from './legacy/plugins/transform';
import { actions } from './legacy/plugins/actions';
import { alerting } from './legacy/plugins/alerting';
import { lens } from './legacy/plugins/lens';
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
    ml(kibana),
    tilemap(kibana),
    grokdebugger(kibana),
    dashboardMode(kibana),
    logstash(kibana),
    beats(kibana),
    apm(kibana),
    maps(kibana),
    canvas(kibana),
    licenseManagement(kibana),
    indexManagement(kibana),
    indexLifecycleManagement(kibana),
    infra(kibana),
    taskManager(kibana),
    rollup(kibana),
    transform(kibana),
    siem(kibana),
    remoteClusters(kibana),
    crossClusterReplication(kibana),
    upgradeAssistant(kibana),
    uptime(kibana),
    fileUpload(kibana),
    encryptedSavedObjects(kibana),
    lens(kibana),
    snapshotRestore(kibana),
    actions(kibana),
    alerting(kibana),
    ingestManager(kibana),
    triggersActionsUI(kibana),
  ];
};
