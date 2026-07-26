/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { MappingField } from '@kbn/agent-builder-genai-utils';
import { otherResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import { getIndexFields } from '@kbn/agent-builder-genai-utils';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';

const getIndexMappingsSchema = z.object({
  indices: z
    .array(z.string())
    .min(1)
    .describe('List of indices, aliases or datastreams to retrieve mappings for.'),
  raw: z
    .boolean()
    .default(false)
    .describe(
      '(Optional) Whether to return the raw mapping tree instead of the summarized fields.'
    ),
});

const renderTypeSegment = (field: MappingField): string => {
  const parts: string[] = [field.type];
  if (field.tsDimension === true) {
    parts.push('ts_dimension');
  }
  if (field.tsMetric != null) {
    parts.push(`ts_metric=${field.tsMetric}`);
  }
  return parts.join(', ');
};

const formatField = (field: MappingField): string => {
  const description = field.meta.description ? ` ${field.meta.description}` : '';
  return `- ${field.path} [${renderTypeSegment(field)}]${description}`;
};

const toFlatField = ({ path, type, tsDimension, tsMetric }: MappingField) => ({
  path,
  type,
  ...(tsDimension === true ? { tsDimension: true } : {}),
  ...(tsMetric != null ? { tsMetric } : {}),
});

const FIELD_LIMIT = 500;

const truncationNote = (totalFields: number): string =>
  `Truncated: showing ${FIELD_LIMIT} of ${totalFields} fields. Use a more specific index pattern to retrieve full mappings.`;

interface MappingNodeProps {
  properties?: Record<string, MappingNodeProps>;
  fields?: Record<string, MappingNodeProps>;
}

const countMappingNodes = (properties: Record<string, MappingNodeProps> | undefined): number => {
  if (!properties) return 0;
  let count = 0;
  for (const value of Object.values(properties)) {
    count++;
    count += countMappingNodes(value.properties);
    count += countMappingNodes(value.fields);
  }
  return count;
};

export const getIndexMappingsTool = (): BuiltinToolDefinition<typeof getIndexMappingsSchema> => {
  return {
    id: platformCoreTools.getIndexMapping,
    type: ToolType.builtin,
    description: 'Retrieve mappings for indices, aliases or datastreams.',
    schema: getIndexMappingsSchema,
    handler: async ({ indices, raw }, { esClient }) => {
      // getIndexFields transparently handles the local-vs-CCS split:
      //  - local indices use _mapping API (full mapping tree in rawMapping)
      //  - CCS indices use batched _field_caps API (flat field list)
      const indexFields = await getIndexFields({
        indices,
        esClient: esClient.asCurrentUser,
      });

      const resources = Object.fromEntries(
        Object.entries(indexFields).map(([name, v]) => {
          const totalFields = v.fields.length;
          const truncated = totalFields > FIELD_LIMIT;
          const cappedFields = truncated ? v.fields.slice(0, FIELD_LIMIT) : v.fields;

          if (raw) {
            if (v.rawMapping) {
              const rawNodeCount = countMappingNodes(
                v.rawMapping.properties as Record<string, MappingNodeProps>
              );
              if (rawNodeCount <= FIELD_LIMIT) {
                return [name, { type: v.type, mappings: v.rawMapping }];
              }
              return [
                name,
                {
                  type: v.type,
                  fields: cappedFields.map(toFlatField),
                  warning: truncated
                    ? truncationNote(totalFields)
                    : `Raw mapping tree has ${rawNodeCount} nodes (limit: ${FIELD_LIMIT}). Showing flat field list instead.`,
                },
              ];
            }

            return [
              name,
              {
                type: v.type,
                fields: cappedFields.map(toFlatField),
                ...(truncated ? { warning: truncationNote(totalFields) } : {}),
              },
            ];
          }

          const formatted = cappedFields.map(formatField).join('\n');
          const fieldString = truncated
            ? `${formatted}\n[${truncationNote(totalFields)}]`
            : formatted;
          return [name, { type: v.type, fields: fieldString }];
        })
      );

      return { results: [otherResult({ resources })] };
    },
    tags: [],
  };
};
