/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from '@kbn/zod';

export interface EcsFlatEntry {
  type?: string;
  description?: string;
  short?: string;
  example?: unknown;
  normalize?: string[];
  original_fieldset?: string;
  allowed_values?: Array<{
    name: string;
    description: string;
    expected_event_types?: string[];
  }>;
}

interface RootFieldResult {
  root_field: string;
  direct_fields: Array<{ field: string; type: string; short: string }>;
  nested_field_sets?: Array<{ path: string; reused_from: string; hint: string }>;
}

const resolveRootField = (
  rootField: string,
  ecsFlatData: Record<string, EcsFlatEntry>
): RootFieldResult | { root_field: string; error: string } => {
  const prefix = `${rootField}.`;
  const allEntries = Object.entries(ecsFlatData).filter(([key]) => key.startsWith(prefix));

  const directFields = allEntries
    .filter(([, entry]) => !entry.original_fieldset)
    .map(([key, entry]) => ({
      field: key,
      type: entry.type ?? 'unknown',
      short: entry.short ?? entry.description ?? '',
    }));

  const nestedFieldSets = new Map<string, string>();
  for (const [key, entry] of allEntries) {
    if (!entry.original_fieldset) continue;
    const parts = key.split('.');
    const fsName = entry.original_fieldset;
    const fsRootParts = fsName.split('.');
    const fsIdx = parts.indexOf(fsRootParts[0]);
    if (fsIdx > 0) {
      const nestedPrefix = parts.slice(0, fsIdx + fsRootParts.length).join('.');
      if (!nestedFieldSets.has(nestedPrefix)) {
        nestedFieldSets.set(nestedPrefix, fsName);
      }
    }
  }

  if (directFields.length === 0 && nestedFieldSets.size === 0) {
    return {
      root_field: rootField,
      error: `No ECS fields found under "${rootField}". Check spelling against the ECS root fields list provided in your context.`,
    };
  }

  const result: RootFieldResult = { root_field: rootField, direct_fields: directFields };

  if (nestedFieldSets.size > 0) {
    result.nested_field_sets = Array.from(nestedFieldSets.entries()).map(
      ([nestedPrefix, fsName]) => ({
        path: `${nestedPrefix}.*`,
        reused_from: fsName,
        hint: `Use root_fields=["${fsName}"] to see these fields, or field_paths for specific lookups`,
      })
    );
  }

  return result;
};

/**
 * Creates a tool that looks up ECS field definitions from a provided ECS flat map.
 * The ECS data is injected at construction time to avoid direct imports of @elastic/ecs,
 * which are restricted in Kibana (bundle size). The service layer loads the data once.
 *
 * @param ecsFlatData - The ECS flat field map (typically EcsFlat from @elastic/ecs)
 */
export function getEcsInfoTool(ecsFlatData: Record<string, EcsFlatEntry>): DynamicStructuredTool {
  const schema = z.object({
    root_fields: z
      .array(z.string())
      .optional()
      .describe(
        'Array of root ECS field names (e.g., ["source", "event", "host"]). Returns direct sub-fields and nested field set summaries for each root. Batch multiple roots in a single call to reduce round-trips.'
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
        return JSON.stringify({
          error: 'Provide at least one of root_fields or field_paths.',
        });
      }

      const result: Record<string, unknown> = {};

      if (rootFields && rootFields.length > 0) {
        result.root_fields_results = rootFields.map((rf: string) =>
          resolveRootField(rf, ecsFlatData)
        );
      }

      if (fieldPaths && fieldPaths.length > 0) {
        const fields = fieldPaths.map((fieldPath: string) => {
          const entry = ecsFlatData[fieldPath];
          if (!entry) {
            return { field: fieldPath, error: 'Not a valid ECS field' };
          }

          const fieldInfo: Record<string, unknown> = {
            field: fieldPath,
            type: entry.type ?? 'unknown',
            description: entry.description ?? '',
            short: entry.short ?? '',
          };

          if (entry.allowed_values) {
            fieldInfo.allowed_values = entry.allowed_values.map((av) => {
              const avInfo: Record<string, unknown> = {
                name: av.name,
                description: av.description,
              };
              if (av.expected_event_types) {
                avInfo.expected_event_types = av.expected_event_types;
              }
              return avInfo;
            });
          }

          if (entry.normalize && entry.normalize.length > 0) {
            fieldInfo.normalize = entry.normalize;
          }

          if (entry.example !== undefined) {
            fieldInfo.example = entry.example;
          }

          return fieldInfo;
        });

        result.fields = fields;
      }

      return JSON.stringify(result);
    },
  });
}
