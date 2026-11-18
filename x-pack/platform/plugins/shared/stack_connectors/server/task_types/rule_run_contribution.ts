/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleRunContribution } from '@kbn/alerting-plugin/server/task_types/rule_run_contribution';
import { registerConnectorTypesForRuleRuns } from './register_connector_types_for_rule_runs';
import { STACK_CONNECTORS_TASK_PROCESS_SETTINGS_ID } from './constants';

/** The connector types of this plugin, which every rule run may enqueue the actions of. */
export const contribution: RuleRunContribution = {
  declares: { registersConnectorTypes: true },
  register: ({ actions }, { publicBaseUrl, settings }) =>
    registerConnectorTypesForRuleRuns(actions, {
      publicBaseUrl,
      enableExperimental: (
        settings[STACK_CONNECTORS_TASK_PROCESS_SETTINGS_ID] as
          | { enableExperimental?: string[] }
          | undefined
      )?.enableExperimental,
    }),
};
