/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { datatableConfigSchemaNoESQL } from '@kbn/lens-embeddable-utils/config_builder/schema';

// Cache — computed once on first request
let cachedDescriptions: Record<string, unknown> | null = null;

function computeDescriptions(): Record<string, unknown> {
  if (cachedDescriptions) return cachedDescriptions;

  const schemas: Record<
    string,
    { schema: { getSchema: () => { describe: () => unknown } }; excludeSections: string[] }
  > = {
    lnsDatatable: {
      schema: datatableConfigSchemaNoESQL,
      excludeSections: [
        'type',
        'title',
        'description',
        'data_source',
        'layer_settings',
        'metrics',
        'rows',
        'split_metrics_by',
        'references',
        'filters',
        'time_shift',
        'reduce_time_range',
      ],
    },
  };

  const result: Record<string, unknown> = {};
  for (const [vizId, { schema, excludeSections }] of Object.entries(schemas)) {
    result[vizId] = {
      description: schema.getSchema().describe(),
      excludeSections,
    };
  }

  cachedDescriptions = result;
  return result;
}

export function registerSchemaDescriptionsRoute(router: IRouter) {
  router.get(
    {
      path: '/internal/lens/schema_descriptions',
      validate: {},
      security: {
        authz: {
          enabled: false,
          reason: 'This route returns static schema metadata for the Lens editor UI',
        },
      },
    },
    async (context, request, response) => {
      return response.ok({
        body: computeDescriptions(),
      });
    }
  );
}
