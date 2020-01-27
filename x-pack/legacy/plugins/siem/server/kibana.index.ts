/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';

import { signalRulesAlertType } from './lib/detection_engine/signals/signal_rule_alert_type';
import { createRulesRoute } from './lib/detection_engine/routes/rules/create_rules_route';
import { createIndexRoute } from './lib/detection_engine/routes/index/create_index_route';
import { readIndexRoute } from './lib/detection_engine/routes/index/read_index_route';
import { readRulesRoute } from './lib/detection_engine/routes/rules/read_rules_route';
import { findRulesRoute } from './lib/detection_engine/routes/rules/find_rules_route';
import { deleteRulesRoute } from './lib/detection_engine/routes/rules/delete_rules_route';
import { updateRulesRoute } from './lib/detection_engine/routes/rules/update_rules_route';
import { setSignalsStatusRoute } from './lib/detection_engine/routes/signals/open_close_signals_route';
import { querySignalsRoute } from './lib/detection_engine/routes/signals/query_signals_route';
import { ServerFacade } from './types';
import { deleteIndexRoute } from './lib/detection_engine/routes/index/delete_index_route';
import { isAlertExecutor } from './lib/detection_engine/signals/types';
import { readTagsRoute } from './lib/detection_engine/routes/tags/read_tags_route';
import { readPrivilegesRoute } from './lib/detection_engine/routes/privileges/read_privileges_route';
import { addPrepackedRulesRoute } from './lib/detection_engine/routes/rules/add_prepackaged_rules_route';
import { createRulesBulkRoute } from './lib/detection_engine/routes/rules/create_rules_bulk_route';
import { updateRulesBulkRoute } from './lib/detection_engine/routes/rules/update_rules_bulk_route';
import { deleteRulesBulkRoute } from './lib/detection_engine/routes/rules/delete_rules_bulk_route';

const APP_ID = 'siem';

export const initServerWithKibana = (context: PluginInitializerContext, __legacy: ServerFacade) => {
  const logger = context.logger.get('plugins', APP_ID);
  const version = context.env.packageInfo.version;

  if (__legacy.plugins.alerting != null) {
    const type = signalRulesAlertType({ logger, version });
    if (isAlertExecutor(type)) {
      __legacy.plugins.alerting.setup.registerType(type);
    }
  }

  // Detection Engine Rule routes that have the REST endpoints of /api/detection_engine/rules
  // All REST rule creation, deletion, updating, etc...
  createRulesRoute(__legacy);
  readRulesRoute(__legacy);
  updateRulesRoute(__legacy);
  deleteRulesRoute(__legacy);
  findRulesRoute(__legacy);
  addPrepackedRulesRoute(__legacy);
  createRulesBulkRoute(__legacy);
  updateRulesBulkRoute(__legacy);
  deleteRulesBulkRoute(__legacy);

  // Detection Engine Signals routes that have the REST endpoints of /api/detection_engine/signals
  // POST /api/detection_engine/signals/status
  // Example usage can be found in siem/server/lib/detection_engine/scripts/signals
  setSignalsStatusRoute(__legacy);
  querySignalsRoute(__legacy);

  // Detection Engine index routes that have the REST endpoints of /api/detection_engine/index
  // All REST index creation, policy management for spaces
  createIndexRoute(__legacy);
  readIndexRoute(__legacy);
  deleteIndexRoute(__legacy);

  // Detection Engine tags routes that have the REST endpoints of /api/detection_engine/tags
  readTagsRoute(__legacy);

  // Privileges API to get the generic user privileges
  readPrivilegesRoute(__legacy);
};
