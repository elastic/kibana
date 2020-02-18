/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyServices } from '../types';
import { GetScopedClients } from '../services';

import { createRulesRoute } from '../lib/detection_engine/routes/rules/create_rules_route';
import { createIndexRoute } from '../lib/detection_engine/routes/index/create_index_route';
import { readIndexRoute } from '../lib/detection_engine/routes/index/read_index_route';
import { readRulesRoute } from '../lib/detection_engine/routes/rules/read_rules_route';
import { findRulesRoute } from '../lib/detection_engine/routes/rules/find_rules_route';
import { deleteRulesRoute } from '../lib/detection_engine/routes/rules/delete_rules_route';
import { updateRulesRoute } from '../lib/detection_engine/routes/rules/update_rules_route';
import { patchRulesRoute } from '../lib/detection_engine/routes/rules/patch_rules_route';
import { setSignalsStatusRoute } from '../lib/detection_engine/routes/signals/open_close_signals_route';
import { querySignalsRoute } from '../lib/detection_engine/routes/signals/query_signals_route';
import { deleteIndexRoute } from '../lib/detection_engine/routes/index/delete_index_route';
import { readTagsRoute } from '../lib/detection_engine/routes/tags/read_tags_route';
import { readPrivilegesRoute } from '../lib/detection_engine/routes/privileges/read_privileges_route';
import { addPrepackedRulesRoute } from '../lib/detection_engine/routes/rules/add_prepackaged_rules_route';
import { createRulesBulkRoute } from '../lib/detection_engine/routes/rules/create_rules_bulk_route';
import { updateRulesBulkRoute } from '../lib/detection_engine/routes/rules/update_rules_bulk_route';
import { patchRulesBulkRoute } from '../lib/detection_engine/routes/rules/patch_rules_bulk_route';
import { deleteRulesBulkRoute } from '../lib/detection_engine/routes/rules/delete_rules_bulk_route';
import { importRulesRoute } from '../lib/detection_engine/routes/rules/import_rules_route';
import { exportRulesRoute } from '../lib/detection_engine/routes/rules/export_rules_route';
import { findRulesStatusesRoute } from '../lib/detection_engine/routes/rules/find_rules_status_route';
import { getPrepackagedRulesStatusRoute } from '../lib/detection_engine/routes/rules/get_prepackaged_rules_status_route';

export type LegacyInitRoutes = (getClients: GetScopedClients) => void;

export const initRoutes = (
  route: LegacyServices['route'],
  config: LegacyServices['config'],
  usingEphemeralEncryptionKey: boolean
) => (getClients: GetScopedClients): void => {
  // Detection Engine Rule routes that have the REST endpoints of /api/detection_engine/rules
  // All REST rule creation, deletion, updating, etc......
  createRulesRoute(route, config, getClients);
  readRulesRoute(route, getClients);
  updateRulesRoute(route, config, getClients);
  patchRulesRoute(route, getClients);
  deleteRulesRoute(route, getClients);
  findRulesRoute(route, getClients);

  addPrepackedRulesRoute(route, config, getClients);
  getPrepackagedRulesStatusRoute(route, getClients);
  createRulesBulkRoute(route, config, getClients);
  updateRulesBulkRoute(route, config, getClients);
  patchRulesBulkRoute(route, getClients);
  deleteRulesBulkRoute(route, getClients);

  importRulesRoute(route, config, getClients);
  exportRulesRoute(route, config, getClients);

  findRulesStatusesRoute(route, getClients);

  // Detection Engine Signals routes that have the REST endpoints of /api/detection_engine/signals
  // POST /api/detection_engine/signals/status
  // Example usage can be found in siem/server/lib/detection_engine/scripts/signals
  setSignalsStatusRoute(route, config, getClients);
  querySignalsRoute(route, config, getClients);

  // Detection Engine index routes that have the REST endpoints of /api/detection_engine/index
  // All REST index creation, policy management for spaces
  createIndexRoute(route, config, getClients);
  readIndexRoute(route, config, getClients);
  deleteIndexRoute(route, config, getClients);

  // Detection Engine tags routes that have the REST endpoints of /api/detection_engine/tags
  readTagsRoute(route, getClients);

  // Privileges API to get the generic user privileges
  readPrivilegesRoute(route, config, usingEphemeralEncryptionKey, getClients);
};
