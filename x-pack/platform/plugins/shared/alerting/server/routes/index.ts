/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinksServiceSetup, IRouter } from '@kbn/core/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import type { ConfigSchema } from '@kbn/unified-search-plugin/server/config';
import { Observable } from 'rxjs';
import { GetAlertIndicesAlias, ILicenseState } from '../lib';
import { AlertingRequestHandlerContext } from '../types';
import { createRuleRoute } from './rule/apis/create';
import { getRuleRoute, getInternalRuleRoute } from './rule/apis/get/get_rule_route';
import { updateRuleRoute } from './rule/apis/update/update_rule_route';
import { deleteRuleRoute } from './rule/apis/delete/delete_rule_route';
import { aggregateRulesRoute } from './rule/apis/aggregate/aggregate_rules_route';
import { disableRuleRoute } from './rule/apis/disable/disable_rule_route';
import { enableRuleRoute } from './rule/apis/enable/enable_rule_route';
import { findRulesRoute } from './rule/apis/find/find_rules_route';
import { findInternalRulesRoute } from './rule/apis/find/find_internal_rules_route';
import { getRuleAlertSummaryRoute } from './get_rule_alert_summary';
import { getRuleExecutionLogRoute } from './get_rule_execution_log';
import { getGlobalExecutionLogRoute } from './get_global_execution_logs';
import { getGlobalExecutionKPIRoute } from './get_global_execution_kpi';
import { getActionErrorLogRoute } from './get_action_error_log';
import { getRuleExecutionKPIRoute } from './get_rule_execution_kpi';
import { getRuleStateRoute } from './get_rule_state';
import { healthRoute } from './framework/apis/health';
import { resolveRuleRoute } from './rule/apis/resolve';
import { ruleTypesRoute } from './rule/apis/list_types/rule_types';
import { muteAllRuleRoute } from './rule/apis/mute_all/mute_all_rule';
import { muteAlertRoute } from './rule/apis/mute_alert/mute_alert';
import { unmuteAllRuleRoute } from './rule/apis/unmute_all';
import { unmuteAlertRoute } from './rule/apis/unmute_alert/unmute_alert_route';
import { updateRuleApiKeyRoute } from './rule/apis/update_api_key/update_rule_api_key_route';
import { bulkEditInternalRulesRoute } from './rule/apis/bulk_edit/bulk_edit_rules_route';
import { snoozeRuleRoute } from './rule/apis/snooze';
import { unsnoozeRuleRoute } from './rule/apis/unsnooze';
import { runSoonRoute } from './run_soon';
import { bulkDeleteRulesRoute } from './rule/apis/bulk_delete/bulk_delete_rules_route';
import { bulkEnableRulesRoute } from './rule/apis/bulk_enable/bulk_enable_rules_route';
import { bulkDisableRulesRoute } from './rule/apis/bulk_disable/bulk_disable_rules_route';
import { cloneRuleRoute } from './rule/apis/clone/clone_rule_route';
import { getFlappingSettingsRoute } from './get_flapping_settings';
import { updateFlappingSettingsRoute } from './update_flapping_settings';
import { getRuleTagsRoute } from './rule/apis/tags/get_rule_tags';
import { getScheduleFrequencyRoute } from './rule/apis/get_schedule_frequency';
import { bulkUntrackAlertsRoute } from './rule/apis/bulk_untrack';
import { bulkUntrackAlertsByQueryRoute } from './rule/apis/bulk_untrack_by_query';

import { createMaintenanceWindowRoute } from './maintenance_window/apis/create/create_maintenance_window_route';
import { getMaintenanceWindowRoute } from './maintenance_window/apis/get/get_maintenance_window_route';
import { updateMaintenanceWindowRoute } from './maintenance_window/apis/update/update_maintenance_window_route';
import { deleteMaintenanceWindowRoute } from './maintenance_window/apis/delete/delete_maintenance_window_route';
import { findMaintenanceWindowsRoute } from './maintenance_window/apis/find/find_maintenance_windows_route';
import { archiveMaintenanceWindowRoute } from './maintenance_window/apis/archive/archive_maintenance_window_route';
import { finishMaintenanceWindowRoute } from './maintenance_window/apis/finish/finish_maintenance_window_route';
import { getActiveMaintenanceWindowsRoute } from './maintenance_window/apis/get_active/get_active_maintenance_windows_route';
import { registerRulesValueSuggestionsRoute } from './suggestions/values_suggestion_rules';
import { registerFieldsRoute } from './suggestions/fields_rules';
import { bulkGetMaintenanceWindowRoute } from './maintenance_window/apis/bulk_get/bulk_get_maintenance_windows_route';
import { registerAlertsValueSuggestionsRoute } from './suggestions/values_suggestion_alerts';
import { getQueryDelaySettingsRoute } from './rules_settings/apis/get/get_query_delay_settings';
import { updateQueryDelaySettingsRoute } from './rules_settings/apis/update/update_query_delay_settings';

// backfill API
import { scheduleBackfillRoute } from './backfill/apis/schedule/schedule_backfill_route';
import { getBackfillRoute } from './backfill/apis/get/get_backfill_route';
import { findBackfillRoute } from './backfill/apis/find/find_backfill_route';
import { deleteBackfillRoute } from './backfill/apis/delete/delete_backfill_route';

// Gaps ApI
import { findGapsRoute } from './gaps/apis/find/find_gaps_route';
import { fillGapByIdRoute } from './gaps/apis/fill/fill_gap_by_id_route';
import { getRuleIdsWithGapsRoute } from './gaps/apis/get_rule_ids_with_gaps/get_rule_ids_with_gaps_route';
import { getGapsSummaryByRuleIdsRoute } from './gaps/apis/get_gaps_summary_by_rule_ids/get_gaps_summary_by_rule_ids_route';
export interface RouteOptions {
  router: IRouter<AlertingRequestHandlerContext>;
  licenseState: ILicenseState;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  getAlertIndicesAlias?: GetAlertIndicesAlias;
  usageCounter?: UsageCounter;
  config$?: Observable<ConfigSchema>;
  isServerless?: boolean;
  docLinks: DocLinksServiceSetup;
}

export function defineRoutes(opts: RouteOptions) {
  const {
    router,
    licenseState,
    encryptedSavedObjects,
    usageCounter,
    config$,
    getAlertIndicesAlias,
  } = opts;

  createRuleRoute(opts);
  getRuleRoute(router, licenseState);
  getInternalRuleRoute(router, licenseState);
  resolveRuleRoute(router, licenseState);
  updateRuleRoute(router, licenseState);
  deleteRuleRoute(router, licenseState);
  aggregateRulesRoute(router, licenseState);
  disableRuleRoute(router, licenseState);
  enableRuleRoute(router, licenseState);
  findRulesRoute(router, licenseState, usageCounter);
  findInternalRulesRoute(router, licenseState, usageCounter);
  getRuleAlertSummaryRoute(router, licenseState);
  getRuleExecutionLogRoute(router, licenseState);
  getRuleExecutionKPIRoute(router, licenseState);
  getRuleStateRoute(router, licenseState);
  ruleTypesRoute(router, licenseState);
  muteAllRuleRoute(router, licenseState, usageCounter);
  unmuteAllRuleRoute(router, licenseState);
  updateRuleApiKeyRoute(router, licenseState);
  bulkEditInternalRulesRoute(router, licenseState);
  bulkDeleteRulesRoute({ router, licenseState });
  bulkEnableRulesRoute({ router, licenseState });
  bulkDisableRulesRoute({ router, licenseState });
  snoozeRuleRoute(router, licenseState);
  unsnoozeRuleRoute(router, licenseState);
  cloneRuleRoute(router, licenseState);
  getRuleTagsRoute(router, licenseState);
  registerRulesValueSuggestionsRoute(router, licenseState, config$!);

  // Alert APIs
  registerAlertsValueSuggestionsRoute(router, licenseState, config$!, getAlertIndicesAlias);
  bulkUntrackAlertsRoute(router, licenseState);
  bulkUntrackAlertsByQueryRoute(router, licenseState);
  muteAlertRoute(router, licenseState);
  unmuteAlertRoute(router, licenseState);

  // Maintenance Window APIs
  createMaintenanceWindowRoute(router, licenseState);
  getMaintenanceWindowRoute(router, licenseState);
  updateMaintenanceWindowRoute(router, licenseState);
  deleteMaintenanceWindowRoute(router, licenseState);
  findMaintenanceWindowsRoute(router, licenseState);
  archiveMaintenanceWindowRoute(router, licenseState);
  finishMaintenanceWindowRoute(router, licenseState);
  getActiveMaintenanceWindowsRoute(router, licenseState);
  bulkGetMaintenanceWindowRoute(router, licenseState);

  // backfill APIs
  scheduleBackfillRoute(router, licenseState);
  getBackfillRoute(router, licenseState);
  findBackfillRoute(router, licenseState);
  deleteBackfillRoute(router, licenseState);

  // Gaps APIs
  findGapsRoute(router, licenseState);
  fillGapByIdRoute(router, licenseState);
  getRuleIdsWithGapsRoute(router, licenseState);
  getGapsSummaryByRuleIdsRoute(router, licenseState);

  // Other APIs
  registerFieldsRoute(router, licenseState);
  getScheduleFrequencyRoute(router, licenseState);
  getQueryDelaySettingsRoute(router, licenseState);
  updateQueryDelaySettingsRoute(router, licenseState);
  getGlobalExecutionLogRoute(router, licenseState);
  getActionErrorLogRoute(router, licenseState);
  getFlappingSettingsRoute(router, licenseState);
  updateFlappingSettingsRoute(router, licenseState);
  runSoonRoute(router, licenseState);
  healthRoute(router, licenseState, encryptedSavedObjects);
  getGlobalExecutionKPIRoute(router, licenseState);
}
