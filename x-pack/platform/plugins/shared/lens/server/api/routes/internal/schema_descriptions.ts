/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import {
  datatableConfigSchemaNoESQL,
  xyConfigSchemaNoESQL,
  heatmapConfigSchemaNoESQL,
  pieConfigSchemaNoESQL,
  metricConfigSchemaNoESQL,
  gaugeConfigSchemaNoESQL,
  tagcloudConfigSchemaNoESQL,
} from '@kbn/lens-embeddable-utils/config_builder/schema';
import type { FieldDescriptor } from '../../../ui_schemas';
import { uiSchemaRegistry } from '../../../ui_schemas';
import { buildFieldDescriptors } from '../../../schema_walker';

interface VizSchemaConfig {
  schema: { getSchema: () => { describe: () => Record<string, unknown> } };
}

// Schema registry mapping viz IDs to their kbn-config-schema instances
const vizSchemas: Record<string, VizSchemaConfig> = {
  lnsDatatable: { schema: datatableConfigSchemaNoESQL },
  lnsXY: { schema: xyConfigSchemaNoESQL },
  lnsHeatmap: { schema: heatmapConfigSchemaNoESQL },
  lnsPie: { schema: pieConfigSchemaNoESQL },
  lnsMetric: { schema: metricConfigSchemaNoESQL },
  lnsGauge: { schema: gaugeConfigSchemaNoESQL },
  lnsTagcloud: { schema: tagcloudConfigSchemaNoESQL },
};

// Cache — computed once on first request
let cachedResult: Record<string, { fields: FieldDescriptor[] }> | null = null;

function computeFieldDescriptors(): Record<string, { fields: FieldDescriptor[] }> {
  if (cachedResult) return cachedResult;

  const result: Record<string, { fields: FieldDescriptor[] }> = {};

  for (const [vizId, config] of Object.entries(vizSchemas)) {
    const uiSchema = uiSchemaRegistry[vizId];
    if (!uiSchema) continue;

    const description = config.schema.getSchema().describe() as Record<string, unknown>;
    const fields = buildFieldDescriptors(
      description as Parameters<typeof buildFieldDescriptors>[0],
      uiSchema
    );

    result[vizId] = { fields };
  }

  cachedResult = result;
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
        body: computeFieldDescriptors(),
      });
    }
  );
}
