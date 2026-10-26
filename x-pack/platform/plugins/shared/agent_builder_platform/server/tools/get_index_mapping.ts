/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize } from 'lodash';
import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { MappingField } from '@kbn/agent-builder-genai-utils';
import { otherResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import { getIndexFields } from '@kbn/agent-builder-genai-utils';
import type { DynamicSchemaBuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createIncludeFrozenSchema, getIncludeFrozenByDefault } from './include_frozen_schema';

const createGetIndexMappingsSchema = memoize((includeFrozenByDefault: boolean) =>
  z.object({
    indices: z
      .array(z.string())
      .min(1)
      .describe(
        'List of indices, aliases, datastreams, or ES|QL views to retrieve fields for. Views return their output columns.'
      ),
    raw: z
      .boolean()
      .default(false)
      .describe(
        '(Optional) Whether to return the raw mapping tree instead of the summarized fields.'
      ),
    include_frozen: createIncludeFrozenSchema(includeFrozenByDefault),
  })
);

type GetIndexMappingsSchema = ReturnType<typeof createGetIndexMappingsSchema>;

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

const NO_FIELDS_FROZEN_EXCLUDED_NOTE =
  'No fields found. Frozen tier indices were excluded from mappings, so this can happen when every backing index of a data stream is on the frozen tier. Retry with include_frozen set to true to include them.';

const NO_FIELDS_NOTE = 'No fields found.';

const fieldsNote = (totalFields: number, includeFrozen: boolean): string | undefined => {
  if (totalFields > FIELD_LIMIT) {
    return truncationNote(totalFields);
  }
  if (totalFields === 0) {
    return includeFrozen ? NO_FIELDS_NOTE : NO_FIELDS_FROZEN_EXCLUDED_NOTE;
  }
  return undefined;
};

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

type GetIndexMappingsTool = DynamicSchemaBuiltinToolDefinition<GetIndexMappingsSchema>;

export const getIndexMappingsTool = (): GetIndexMappingsTool => {
  return {
    id: platformCoreTools.getIndexMapping,
    type: ToolType.builtin,
    description:
      'Retrieve mappings for indices, aliases or datastreams, or the output columns of an ES|QL view. A view is not an index: if a name is missing from list_indices indices, check views before reporting it as not found.',
    annotations: {
      title: 'Get Index Mapping',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    getSchema: async (schemaContext) =>
      createGetIndexMappingsSchema(await getIncludeFrozenByDefault(schemaContext)),
    handler: async ({ indices, raw, include_frozen: includeFrozen }, { esClient }) => {
      // getIndexFields transparently handles the local-vs-CCS split:
      //  - local indices use _mapping API (full mapping tree in rawMapping)
      //  - CCS indices use batched _field_caps API (flat field list)
      const indexFields = await getIndexFields({
        indices,
        includeViews: true,
        includeFrozen,
        esClient: esClient.asCurrentUser,
      });

      const resources = Object.fromEntries(
        Object.entries(indexFields).map(([name, v]) => {
          const totalFields = v.fields.length;
          const truncated = totalFields > FIELD_LIMIT;
          const cappedFields = truncated ? v.fields.slice(0, FIELD_LIMIT) : v.fields;
          const note = fieldsNote(totalFields, includeFrozen);

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
                ...(note ? { warning: note } : {}),
              },
            ];
          }

          const formatted = cappedFields.map(formatField).join('\n');
          const fieldString = note
            ? [formatted, `[${note}]`].filter(Boolean).join('\n')
            : formatted;
          return [name, { type: v.type, fields: fieldString }];
        })
      );

      return { results: [otherResult({ resources })] };
    },
    tags: [],
  };
};
