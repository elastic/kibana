/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { VEGA_VISUALIZATION_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';

import { dashboardTools } from '../../../common';
import { validateSpec } from './validate_spec';
import {
  CREATE_VEGA_VISUALIZATION_FAILURE_TYPES,
  type CreateVegaVisualizationFailure,
} from './failure_types';

const createVegaVisualizationSchema = z.object({
  title: z
    .string()
    .min(1, 'title must be non-empty')
    .describe('Display title for the visualization. Shown on the rendered attachment.'),
  spec: z
    .string()
    .min(1, 'spec must be non-empty')
    .describe(
      'A JSON-encoded Vega or Vega-Lite specification. Must include a recognized `$schema` URL (https://vega.github.io/schema/vega-lite/vN.json or https://vega.github.io/schema/vega/vN.json). HJSON / triple-quoted strings are not supported. Embed ES|QL data via the standard Vega ES|QL data source: `{ "%type%": "esql", "query": "..." }`. Always RENAME dotted ES|QL field names before referencing them in encodings.'
    ),
});

const buildErrorResult = (failure: CreateVegaVisualizationFailure, metadata: object) => ({
  results: [
    {
      type: ToolResultType.error,
      data: {
        message: failure.message,
        metadata: {
          failure_type: failure.type,
          ...(failure.path !== undefined && { path: failure.path }),
          ...metadata,
        },
      },
    },
  ],
});

export const createVegaVisualizationTool = (): BuiltinSkillBoundedTool<
  typeof createVegaVisualizationSchema
> => ({
  id: dashboardTools.createVegaVisualization,
  type: ToolType.builtin,
  description: `Create a Vega or Vega-Lite visualization attachment from a JSON spec.

This tool will:
1. Parse and JSON Schema validate the spec (dialect detected from $schema)
2. Persist the spec as a "vega-visualization" attachment in conversation context
3. Return an attachment_id that can be rendered inline or placed on a dashboard via manage_dashboard add_panels with kind: "attachment"

There is no update flow: to revise a chart, call this tool again to create a new attachment.

The embedded ES|QL query is NOT validated here. Generate ES|QL with platform.core.generate_esql first.`,
  schema: createVegaVisualizationSchema,
  handler: async ({ title, spec }, { logger, attachments }) => {
    const validation = validateSpec(spec);
    if (!validation.ok) {
      logger.warn(
        `create_vega_visualization rejected spec: ${validation.failure.type} - ${validation.failure.message}`
      );
      return buildErrorResult(validation.failure, { title });
    }

    try {
      const attachment = await attachments.add({
        type: VEGA_VISUALIZATION_ATTACHMENT_TYPE,
        description: `Vega visualization: ${title}`,
        data: {
          title,
          spec: validation.spec,
          dialect: validation.dialect,
        },
      });

      logger.debug(`Created ${validation.dialect} attachment ${attachment.id}`);

      return {
        results: [
          {
            type: ToolResultType.other,
            tool_result_id: getToolResultId(),
            data: {
              attachment_id: attachment.id,
              title,
              dialect: validation.dialect,
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`create_vega_visualization failed to persist attachment: ${message}`);
      return buildErrorResult(
        {
          type: CREATE_VEGA_VISUALIZATION_FAILURE_TYPES.persistence,
          message: `Failed to persist Vega visualization attachment: ${message}`,
        },
        { title }
      );
    }
  },
});
