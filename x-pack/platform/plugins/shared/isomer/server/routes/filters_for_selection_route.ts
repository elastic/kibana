/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { PrimitiveNode, ValidationError } from '@kbn/isomer';
import {
  FILTERS_FOR_SELECTION_API_PATH,
  FILTERS_FOR_SELECTION_API_VERSION,
  MATERIALIZE_FEATURE_FLAG,
} from '../../common/constants';
import { abortSignalFor } from '../materialize/abort_signal';
import type { ChartEvent } from '../materialize/nodes';
import { isValidNode } from '../materialize/validate_node';
import type { MaterializeScope, ScopedMaterializeClient } from '../materialize/types';
import {
  filtersForSelectionRequestBodySchema,
  filtersForSelectionResponseBodySchema,
} from './schemas';

export interface FiltersForSelectionRouteDeps {
  router: IRouter;
  createClient: (scope: MaterializeScope) => ScopedMaterializeClient;
  /** The node's validation errors against the Isomer version Kibana pins. */
  validateNode: (node: PrimitiveNode) => Promise<ValidationError[]>;
}

const MAX_BODY_BYTES = 10 * 1024 * 1024;

const describeErrors = (errors: ValidationError[]) =>
  errors
    .slice(0, 3)
    .map(({ path, message }) => (path ? `${path} ${message}` : message))
    .join('; ');

export const registerFiltersForSelectionRoute = ({
  router,
  createClient,
  validateNode,
}: FiltersForSelectionRouteDeps) => {
  router.versioned
    .post({
      path: FILTERS_FOR_SELECTION_API_PATH,
      access: 'public',
      summary: 'Turn a selection on a materialized node into Kibana filters',
      description:
        'Takes a `chart.select` or `chart.brush` event and the node it was raised on, as `POST /api/isomer/materialize` returned it, and returns the Kibana filters the selection stands for, built as Kibana builds them for a click or brush on the same panel. Keep the filters and pass them back in `context.filters` to materialize again.',
      security: {
        authz: {
          enabled: false,
          reason:
            'Filters resolve as the requesting user: data views load through the scoped saved objects client and field capabilities through the scoped Elasticsearch client.',
        },
      },
      options: {
        tags: ['oas-tag:isomer'],
        availability: { stability: 'experimental' },
        body: { maxBytes: MAX_BODY_BYTES },
      },
    })
    .addVersion(
      {
        version: FILTERS_FOR_SELECTION_API_VERSION,
        validate: {
          request: { body: filtersForSelectionRequestBodySchema },
          response: {
            200: {
              description: 'The filters the selection stands for.',
              body: () => filtersForSelectionResponseBodySchema,
            },
            400: {
              description:
                'The node is not a valid materialized node, or the selection does not fit it.',
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
        const { node } = request.body;
        const errors = await validateNode(node);
        if (!isValidNode(node, errors)) {
          return response.badRequest({
            body: { message: `Invalid node: ${describeErrors(errors)}` },
          });
        }
        const client = createClient({
          request,
          savedObjectsClient: savedObjects.client,
          abortSignal: abortSignalFor(request),
        });
        try {
          const filters = await client.filtersForSelection(request.body.event as ChartEvent, node);
          return response.ok({ body: { filters } });
        } catch (error) {
          if (error instanceof Error && error.name === 'SelectionError') {
            return response.badRequest({ body: { message: error.message } });
          }
          throw error;
        }
      }
    );
};
