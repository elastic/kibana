/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { xpackMain } from './legacy/plugins/xpack_main';
import { monitoring } from './legacy/plugins/monitoring';
import { reporting } from './legacy/plugins/reporting';
import { security } from './legacy/plugins/security';
import { dashboardMode } from './legacy/plugins/dashboard_mode';
import { beats } from './legacy/plugins/beats_management';
import { maps } from './legacy/plugins/maps';
import { spaces } from './legacy/plugins/spaces';
import { ingestManager } from './legacy/plugins/ingest_manager';

module.exports = function(kibana) {
  return [
    xpackMain(kibana),
    monitoring(kibana),
    reporting(kibana),
    spaces(kibana),
    security(kibana),
    dashboardMode(kibana),
    beats(kibana),
    maps(kibana),
    ingestManager(kibana),
  ];
};
