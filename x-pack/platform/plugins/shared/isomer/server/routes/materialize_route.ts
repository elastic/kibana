/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { Composition } from '@kbn/isomer';
import type { MaterializeContext } from '../../common';
import {
  MATERIALIZE_API_PATH,
  MATERIALIZE_API_VERSION,
  MATERIALIZE_FEATURE_FLAG,
} from '../../common/constants';
import { abortSignalFor } from '../materialize/abort_signal';
import type { MaterializedNode } from '../materialize/nodes';
import { isUnsupportedNode } from '../materialize/nodes';
import type { MaterializeScope, ScopedMaterializeClient } from '../materialize/types';
import type { MaterializeRequestBody } from './schemas';
import { materializeRequestBodySchema, materializeResponseBodySchema } from './schemas';

/** Dependencies required to register the materialize API route. */
interface MaterializeRouteDeps {
  /** Router that registers the versioned public endpoint. */
  router: IRouter;
  /** Creates a client scoped to the current request. */
  createClient: (scope: MaterializeScope) => ScopedMaterializeClient;
}

export const toContext = ({
  time_range: timeRange,
  query,
  filters,
  esql_variables: esqlVariables,
  time_zone: timeZone,
  locale,
}: NonNullable<MaterializeRequestBody['context']> = {}): MaterializeContext => ({
  ...(timeRange ? { timeRange } : {}),
  ...(query ? { query } : {}),
  ...(filters ? { filters } : {}),
  ...(esqlVariables ? { esqlVariables } : {}),
  ...(timeZone ? { timeZone } : {}),
  ...(locale ? { locale } : {}),
});

/** Marks a grid with placeholders among its panels as degraded, saying how many. */
const partialFailure = (
  node: MaterializedNode
): NonNullable<Composition['meta']>['partialFailure'] => {
  if (node.type !== 'grid') {
    return undefined;
  }
  const panels = [...node.panels, ...(node.sections ?? []).flatMap(({ panels: inner }) => inner)];
  const unsupported = panels.filter((panel) => isUnsupportedNode(panel.node)).length;
  return unsupported > 0
    ? {
        degraded: true,
        reason: i18n.translate('xpack.isomer.materialize.route.panelsUnavailable', {
          defaultMessage:
            '{unsupported} of {total} {total, plural, one {panel} other {panels}} could not be shown.',
          values: { unsupported, total: panels.length },
        }),
      }
    : undefined;
};

/** Wraps a node in the composition the route returns. */
export const toComposition = (node: MaterializedNode): Composition<MaterializedNode> => {
  const degraded = partialFailure(node);
  return {
    type: 'view',
    ...('title' in node && typeof node.title === 'string' ? { title: node.title } : {}),
    body: [node],
    meta: {
      source: 'kibana',
      generatedAt: new Date().toISOString(),
      ...(degraded ? { partialFailure: degraded } : {}),
    },
  };
};

/** Registers the versioned public route that returns a one-node Isomer composition. */
export const registerMaterializeRoute = ({ router, createClient }: MaterializeRouteDeps) => {
  router.versioned
    .post({
      path: MATERIALIZE_API_PATH,
      access: 'public',
      summary: 'Materialize a saved object as an Isomer composition',
      description:
        'Loads a saved object by ID, or takes its as-code config, and returns an Isomer composition holding one node. Content that needs data requests the current pipeline cannot run returns an `unsupported` node that says why.',
      security: {
        authz: {
          enabled: false,
          reason:
            'Materialization runs as the requesting user: saved objects load through the scoped saved objects client and queries run through the scoped Elasticsearch client.',
        },
      },
      options: {
        tags: ['oas-tag:isomer'],
        availability: { stability: 'experimental' },
      },
    })
    .addVersion(
      {
        version: MATERIALIZE_API_VERSION,
        validate: {
          request: { body: materializeRequestBodySchema },
          response: {
            200: {
              description: 'The materialized composition.',
              body: () => materializeResponseBodySchema,
            },
            404: { description: 'Materialization is not enabled.' },
          },
        },
      },
      async (context, request, response) => {
        const { featureFlags, savedObjects } = await context.core;
        if (!(await featureFlags.getBooleanValue(MATERIALIZE_FEATURE_FLAG, false))) {
          return response.notFound();
        }
        const { input, context: materializeContext } = request.body;
        const client = createClient({
          request,
          savedObjectsClient: savedObjects.client,
          abortSignal: abortSignalFor(request),
        });
        const node = await client.materialize(input, toContext(materializeContext));
        return response.ok({ body: toComposition(node) });
      }
    );
};
