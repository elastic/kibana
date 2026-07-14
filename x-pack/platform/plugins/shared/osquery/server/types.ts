/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryPluginSetup, TelemetryPluginStart } from '@kbn/telemetry-plugin/server';
import type { ActionsPlugin } from '@kbn/actions-plugin/server';
import type {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';

import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type {
  TaskManagerSetupContract as TaskManagerPluginSetup,
  TaskManagerStartContract as TaskManagerPluginStart,
} from '@kbn/task-manager-plugin/server';
import type { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
import type { RuleRegistryPluginStartContract } from '@kbn/rule-registry-plugin/server';
import type { CasesServerSetup } from '@kbn/cases-plugin/server';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { createActionService } from './handlers/action/create_action_service';

export interface CheckResponseActionAuthzParams {
  saved_query_id?: string;
  pack_id?: string;
}

export interface OsqueryPluginSetup {
  createActionService: ReturnType<typeof createActionService>;
  /**
   * Validates that the requesting user has the required osquery privileges
   * for the given response action configuration.
   * Throws a 403 CustomHttpRequestError if the user lacks authorization.
   *
   * Used by security_solution when creating/updating detection rules
   * that include osquery response actions.
   */
  checkResponseActionAuthz: (
    request: KibanaRequest,
    actionParams: CheckResponseActionAuthzParams
  ) => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface OsqueryPluginStart {}

export interface SetupPlugins {
  actions: ActionsPlugin['setup'];
  cases?: CasesServerSetup;
  data: DataPluginSetup;
  features: FeaturesPluginSetup;
  security: SecurityPluginStart;
  taskManager?: TaskManagerPluginSetup;
  telemetry?: TelemetryPluginSetup;
  licensing: LicensingPluginSetup;
  spaces?: SpacesPluginSetup;
}

export interface StartPlugins {
  actions: ActionsPlugin['start'];
  data: DataPluginStart;
  dataViews: DataViewsPluginStart;
  fleet?: FleetStartContract;
  taskManager?: TaskManagerPluginStart;
  telemetry?: TelemetryPluginStart;
  ruleRegistry?: RuleRegistryPluginStartContract;
  spaces?: SpacesPluginStart;
}
