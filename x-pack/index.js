/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { xpackMain } from './legacy/plugins/xpack_main';
import { monitoring } from './legacy/plugins/monitoring';
import { security } from './legacy/plugins/security';
import { beats } from './legacy/plugins/beats_management';
import { spaces } from './legacy/plugins/spaces';

module.exports = function (kibana) {
  return [xpackMain(kibana), monitoring(kibana), spaces(kibana), security(kibana), beats(kibana)];
};
