/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import {
  Streams,
  type FieldDefinitionConfig,
  type ClassicFieldDefinition,
} from '@kbn/streams-schema';
import dedent from 'dedent';
import type { GetScopedClients } from '../../../routes/types';
import { STREAMS_MAP_FIELDS_TOOL_ID } from '../tool_ids';
import { classifyError } from '../error_utils';
import { patchIngestAndUpsert } from '../../../lib/streams/helpers/ingest_upsert';
import { getConfirmationMessage } from './confirmation_helpers';
import { type StreamsWriteQueue, abortSignalFromRequest } from '../write_queue';

const mapFieldsSchema = z.object({
  name: z.string().describe('Stream name, e.g. "logs.ecs.nginx"'),
  fields_json: z
    .string()
    .describe(
      'JSON string mapping field names to definitions. Each field needs at least a "type". Example: \'{"response_time":{"type":"long"},"user.name":{"type":"keyword"}}\'. Valid types: keyword, match_only_text, long, double, date, boolean, ip, geo_point, system.'
    ),
  change_description: z
    .string()
    .optional()
    .describe(
      'Markdown summary of the field mapping for the user confirmation prompt. List each field with its type.'
    ),
});

export const createMapFieldsTool = ({
  getScopedClients,
  writeQueue,
}: {
  getScopedClients: GetScopedClients;
  writeQueue: StreamsWriteQueue;
}): BuiltinToolDefinition<typeof mapFieldsSchema> => ({
  id: STREAMS_MAP_FIELDS_TOOL_ID,
  type: ToolType.builtin,
  description: dedent(`
    Maps unmapped fields on a stream by adding field definitions.
    For wired streams, adds to ingest.wired.fields.
    For classic streams, adds to ingest.classic.field_overrides.
  `),
  tags: ['streams', 'management'],
  schema: mapFieldsSchema,
  confirmation: {
    askUser: 'always',
    getConfirmation: ({ toolParams }) => {
      let fieldCount: number;
      try {
        fieldCount = Object.keys(JSON.parse(toolParams.fields_json)).length;
      } catch {
        return {
          title: i18n.translate('xpack.streams.agentBuilder.tools.mapFields.invalidJsonTitle', {
            defaultMessage: 'Invalid field mapping JSON',
          }),
          message: i18n.translate(
            'xpack.streams.agentBuilder.tools.mapFields.invalidJsonDescription',
            {
              defaultMessage:
                '**Stream**: {name}\n\nThe `fields_json` parameter is not valid JSON and cannot be previewed. Cancel and retry with corrected input.',
              values: { name: toolParams.name },
            }
          ),
          confirm_text: i18n.translate(
            'xpack.streams.agentBuilder.tools.mapFields.invalidJsonButtonLabel',
            { defaultMessage: 'Try anyway' }
          ),
          color: 'danger' as const,
        };
      }
      return {
        title: i18n.translate('xpack.streams.agentBuilder.tools.mapFields.confirmTitle', {
          defaultMessage:
            'Map {fieldCount} {fieldCount, plural, one {field} other {fields}} on "{name}"',
          values: { fieldCount, name: toolParams.name },
        }),
        message: getConfirmationMessage(toolParams, 'change_description'),
        confirm_text: i18n.translate(
          'xpack.streams.agentBuilder.tools.mapFields.confirmButtonLabel',
          { defaultMessage: 'Map fields' }
        ),
        color: 'primary' as const,
      };
    },
  },
  handler: async ({ name, fields_json: fieldsJson }, { request }) => {
    const signal = abortSignalFromRequest(request);
    try {
      const { streamsClient, getQueryClient, attachmentClient } = await getScopedClients({
        request,
      });
      const queryClient = await getQueryClient();

      let fields: Record<string, FieldDefinitionConfig>;
      try {
        fields = JSON.parse(fieldsJson) as Record<string, FieldDefinitionConfig>;
      } catch {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Invalid fields JSON: ${fieldsJson}`,
                operation: 'map_fields',
                likely_cause: 'The fields_json parameter must be a valid JSON string.',
              },
            },
          ],
        };
      }

      const definition = await streamsClient.getStream(name);

      if (Streams.WiredStream.Definition.is(definition)) {
        const result = await writeQueue.enqueue(
          () =>
            patchIngestAndUpsert({
              streamsClient,
              queryClient,
              attachmentClient,
              name,
              patchFn: (currentIngest) => ({
                ...currentIngest,
                wired: {
                  ...(currentIngest as Streams.WiredStream.Definition['ingest']).wired,
                  fields: {
                    ...(currentIngest as Streams.WiredStream.Definition['ingest']).wired.fields,
                    ...fields,
                  },
                },
              }),
            }),
          signal
        );

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                success: true,
                stream: name,
                mapped_fields: Object.keys(fields),
                note: 'Field mappings updated. Mappings are applied to all backing indices, so existing documents with these fields are now searchable under the new type.',
                result: result.result,
              },
            },
          ],
        };
      }

      if (Streams.ClassicStream.Definition.is(definition)) {
        const classicFields = fields as unknown as ClassicFieldDefinition;
        const result = await writeQueue.enqueue(
          () =>
            patchIngestAndUpsert({
              streamsClient,
              queryClient,
              attachmentClient,
              name,
              patchFn: (currentIngest) => ({
                ...currentIngest,
                classic: {
                  ...(currentIngest as Streams.ClassicStream.Definition['ingest']).classic,
                  field_overrides: {
                    ...(currentIngest as Streams.ClassicStream.Definition['ingest']).classic
                      .field_overrides,
                    ...classicFields,
                  },
                },
              }),
            }),
          signal
        );

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                success: true,
                stream: name,
                mapped_fields: Object.keys(fields),
                note: 'Field mappings updated. Mappings are applied to all backing indices, so existing documents with these fields are now searchable under the new type.',
                result: result.result,
              },
            },
          ],
        };
      }

      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Stream "${name}" is not a wired or classic stream. Field mapping is not supported.`,
              stream: name,
              operation: 'map_fields',
              likely_cause: 'Stream type does not support field mapping.',
            },
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to map fields on "${name}": ${message}`,
              stream: name,
              operation: 'map_fields',
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    }
  },
});
