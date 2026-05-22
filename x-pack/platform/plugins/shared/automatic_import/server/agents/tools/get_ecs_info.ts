/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from '@kbn/zod/v4';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server';

/**
 * Creates a tool that looks up ECS field definitions using the fields_metadata client.
 */
export function getEcsInfoTool(fieldsMetadataClient: IFieldsMetadataClient): DynamicStructuredTool {
  const schema = z.object({
    root_fields: z
      .array(z.string())
      .optional()
      .describe(
        'Array of root ECS field names (e.g., ["source", "event", "host"]). Returns direct sub-fields for each root. Batch multiple roots in a single call to reduce round-trips.'
      ),
    field_paths: z
      .array(z.string())
      .optional()
      .describe(
        'Array of full ECS field paths (e.g., ["source.ip", "event.category"]). Returns full field metadata including type, description, allowed_values.'
      ),
  });

  return new DynamicStructuredTool({
    name: 'get_ecs_info',
    description:
      'Looks up ECS (Elastic Common Schema) field definitions. ' +
      'Use root_fields (array) to browse sub-fields under one or more roots at once (e.g., ["source", "destination"] returns source.ip, source.port, destination.ip, etc.). ' +
      'Use field_paths to get full metadata for specific fields. ' +
      'Batch multiple roots or paths in a single call to minimize round-trips. ' +
      'Provide at least one of root_fields or field_paths.',
    schema,
    func: async (input: { root_fields?: string[]; field_paths?: string[] }) => {
      const { root_fields: rootFields, field_paths: fieldPaths } = input;

      if ((!rootFields || rootFields.length === 0) && (!fieldPaths || fieldPaths.length === 0)) {
        return JSON.stringify({ error: 'Provide at least one of root_fields or field_paths.' });
      }

      const result: Record<string, unknown> = {};

      if (rootFields && rootFields.length > 0) {
        result.root_fields_results = await Promise.all(
          rootFields.map(async (rf: string) => {
            const childrenDict = await fieldsMetadataClient.getFieldChildren(rf, {
              source: ['ecs'],
            });
            const fields = childrenDict.pick(['type', 'short']);
            if (Object.keys(fields).length === 0) {
              return {
                root_field: rf,
                error: `No ECS fields found under "${rf}". Check spelling against the ECS root fields list provided in your context.`,
              };
            }
            return { root_field: rf, fields };
          })
        );
      }

      if (fieldPaths && fieldPaths.length > 0) {
        const dict = await fieldsMetadataClient.find({ fieldNames: fieldPaths, source: ['ecs'] });
        const fields = dict.pick([
          'type',
          'description',
          'short',
          'allowed_values',
          'normalize',
          'example',
        ]);
        const notFound = fieldPaths.filter((fp) => !fields[fp]);
        result.fields = fields;
        if (notFound.length > 0) result.fields_not_found = notFound;
      }

      return JSON.stringify(result);
    },
  });
}
