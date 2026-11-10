/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  listEntityGraphTraversalScenarioIds,
  loadEntityGraphTraversalPlan,
} from '@kbn/workflows/managed';
import { loadEntityGraphTraversalScenarioStepCommonDefinition } from '../../../../common/workflow/steps/entity_graph_traversal/load_entity_graph_traversal_scenario_step_common';
import { resolveLatestEntityIndex } from '../../../domain/graph_traversal/resolve_latest_entity_index';
import { resolveSpaceId } from './resolve_space_id';

export const loadEntityGraphTraversalScenarioStepDefinition = createServerStepDefinition({
  ...loadEntityGraphTraversalScenarioStepCommonDefinition,
  handler: async (context) => {
    const { scenario_id, overrides, until } = context.input;
    try {
      const plan = loadEntityGraphTraversalPlan(scenario_id, overrides);
      if (!plan) {
        return {
          error: new Error(
            `Unknown entity graph traversal scenario "${scenario_id}". Available: ${listEntityGraphTraversalScenarioIds().join(
              ', '
            )}`
          ),
        };
      }
      context.logger.debug(
        `entity graph traversal scenario "${plan.id}" loaded: ${
          plan.hops.length
        } hops, limits ${JSON.stringify(plan.limits)}`
      );
      // The execution space and the concrete lookup-join index are resolved once here and
      // handed to every hop, which otherwise repeats both lookups per hop.
      const spaceId = await resolveSpaceId(context.contextManager);
      let lookupIndex: string | undefined;
      try {
        lookupIndex = await resolveLatestEntityIndex(
          context.contextManager.getScopedEsClient(),
          spaceId
        );
      } catch (error) {
        context.logger.debug(
          `entity graph traversal: no latest entity index to join in space "${spaceId}": ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
      return {
        output: {
          ...plan,
          until: [...plan.until, ...until],
          space_id: spaceId,
          ...(lookupIndex !== undefined && { lookup_index: lookupIndex }),
        },
      };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  },
});
