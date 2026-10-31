/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core-http-server';
import { z, lazySchema } from '@kbn/zod/v4';
import { SECURITY_ENTITY_GRAPH_TRAVERSAL_WORKFLOW_ID } from '@kbn/workflows/managed';
import { buildStrictRouteValidationWithZod } from '../utils/build_strict_route_validation';
import {
  API_VERSIONS,
  getDefaultGraphTraversalScenarioId,
  ENTITY_STORE_ROUTES,
  type RunGraphTraversalResponse,
} from '../../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { enforceEntityStorePrivileges } from '../utils/check_entity_store_privileges';
import {
  DEFAULT_GRAPH_TRAVERSAL_TIMEOUT_MS,
  GraphTraversalError,
} from '../../../domain/graph_traversal';

/** Keep the socket open past the traversal's own deadline so the timeout error can be returned. */
const RUN_GRAPH_TRAVERSAL_SOCKET_TIMEOUT_MS = DEFAULT_GRAPH_TRAVERSAL_TIMEOUT_MS + 60 * 1000;

const fieldValuesSchema = () =>
  z.object({
    field: z
      .string()
      .min(1)
      .max(256)
      .regex(/^[A-Za-z_@][A-Za-z0-9_.@-]*$/),
    values: z.array(z.string().min(1).max(2048)).min(1).max(100),
  });

export const runGraphTraversalBodySchema = lazySchema(() =>
  z.object({
    entity_id: z.string().min(1).max(2048),
    scenario_id: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-z][a-z0-9-]*$/)
      .optional(),
    lookback: z
      .string()
      .regex(/^[0-9]{1,5}(m|h|d)$/)
      .optional(),
    max_hops: z.number().int().min(1).max(20).optional(),
    exclusions: z.array(fieldValuesSchema()).max(50).optional(),
    /** Stop once a node matching one of these is reached; added to the scenario's own. */
    until: z.array(fieldValuesSchema()).max(50).optional(),
    /** Run as one ES|QL GRAPH EXPAND statement instead of the workflow (snapshot builds only). */
    esql: z.boolean().optional(),
  })
);

export function registerRunGraphTraversal(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: ENTITY_STORE_ROUTES.internal.GRAPH_TRAVERSAL_RUN,
      access: 'internal',
      summary: 'Run an entity graph traversal',
      description:
        'Runs the entity graph traversal workflow from the given entity and returns the traversed nodes and edges.',
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
      options: {
        timeout: {
          idleSocket: RUN_GRAPH_TRAVERSAL_SOCKET_TIMEOUT_MS,
        },
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v2,
        validate: {
          request: {
            body: buildStrictRouteValidationWithZod(runGraphTraversalBodySchema),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { assetManagerClient, graphTraversalClient, graphTraversalEsqlClient } =
          entityStoreCtx;

        const forbidden = await enforceEntityStorePrivileges(assetManagerClient, req, res);
        if (forbidden) return forbidden;

        const {
          entity_id: entityId,
          scenario_id: scenarioId,
          lookback,
          max_hops: maxHops,
          exclusions,
          until,
          esql,
        } = req.body;
        const effectiveScenarioId = scenarioId ?? getDefaultGraphTraversalScenarioId(entityId);

        try {
          if (esql) {
            const body: RunGraphTraversalResponse = await graphTraversalEsqlClient.run({
              scenarioId: effectiveScenarioId,
              seedId: entityId,
              lookback,
              maxHops,
              exclusions,
              until,
            });
            return res.ok({ body });
          }
          const body: RunGraphTraversalResponse = await graphTraversalClient.run({
            workflowId: SECURITY_ENTITY_GRAPH_TRAVERSAL_WORKFLOW_ID,
            request: req,
            inputs: {
              scenario_id: effectiveScenarioId,
              seed_id: entityId,
              ...(lookback !== undefined && { lookback }),
              ...(maxHops !== undefined && { max_hops: maxHops }),
              ...(exclusions !== undefined && { exclusions }),
              ...(until !== undefined && { until }),
            },
          });
          return res.ok({ body });
        } catch (error) {
          if (error instanceof GraphTraversalError) {
            return res.customError({
              statusCode: error.statusCode,
              body: { message: error.message },
            });
          }
          throw error;
        }
      })
    );
}
