/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TasksPlugin } from '@kbn/core/server';
import type { RuleRegistryPluginStartContract } from '../plugin';
import { ruleRegistryBridge } from './bridge';

/**
 * The part of the rule registry start contract a task uses: the RAC alerts client.
 *
 * In Kibana it is the plugin's own (the bridge). A task pod cannot build one: the client authorizes
 * and resolves alert indices through the alerting rule type registry and the rule data service,
 * which the rule types and registrations of plugins that run only in Kibana fill. Asking for the
 * client there fails with an error that says so.
 */
export type RuleRegistryTasksStart = Pick<
  RuleRegistryPluginStartContract,
  'getRacClientWithRequest'
>;

class RuleRegistryTasksPlugin implements TasksPlugin<void, RuleRegistryTasksStart> {
  setup() {}

  start(): RuleRegistryTasksStart {
    return (
      ruleRegistryBridge.getStart() ?? {
        getRacClientWithRequest: async () => {
          throw new Error(
            'The alerts client (RAC) is not available in a task pod: it needs the alerting rule type ' +
              'registry and the rule data service, which are filled by the plugins that run only in ' +
              'Kibana. Run this step or tool in Kibana.'
          );
        },
      }
    );
  }
}

export const plugin = async () => new RuleRegistryTasksPlugin();
