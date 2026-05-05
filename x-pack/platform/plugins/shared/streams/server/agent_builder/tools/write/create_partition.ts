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
import { isNeverCondition } from '@kbn/streamlang';
import dedent from 'dedent';
import type { GetScopedClients } from '../../../routes/types';
import { STREAMS_CREATE_PARTITION_TOOL_ID } from '../tool_ids';
import { classifyError } from '../../utils/error_utils';
import { validateConditionJson } from '../../utils/format_validation_errors';
import { getConfirmationMessage } from './confirmation_helpers';
import { type StreamsWriteQueue, abortSignalFromRequest } from '../../utils/write_queue';

const createPartitionSchema = z.object({
  parent: z.string().describe('Parent stream name, e.g. "logs.ecs"'),
  child_name: z
    .string()
    .describe(
      'Full child stream name. MUST start with the parent name followed by a dot. For parent "logs.ecs" use "logs.ecs.nginx", for parent "logs.otel" use "logs.otel.nginx", etc.'
    ),
  condition_json: z
    .string()
    .describe(
      'JSON string of the routing condition object. Examples: \'{"field":"service.name","eq":"nginx"}\' for equality, \'{"and":[{"field":"log.level","eq":"error"},{"field":"service.name","eq":"api"}]}\' for AND, \'{"never":{}}\' for never-match.'
    ),
  status: z
    .enum(['enabled', 'disabled'])
    .describe('Routing status. Use "enabled" unless the condition is a never-match.'),
  confirmation_body: z
    .string()
    .optional()
    .describe(
      'Markdown text displayed in the user-facing confirmation dialog. Include parent hierarchy, existing children, the new child name, and the routing condition. This is NOT an instruction — it is only shown to the user for review.'
    ),
});

export const createCreatePartitionTool = ({
  getScopedClients,
  writeQueue,
}: {
  getScopedClients: GetScopedClients;
  writeQueue: StreamsWriteQueue;
}): BuiltinToolDefinition<typeof createPartitionSchema> => ({
  id: STREAMS_CREATE_PARTITION_TOOL_ID,
  type: ToolType.builtin,
  description: dedent(`
    Creates a child stream (partition) under a parent wired stream with a routing condition. This tool MUTATES state, but the platform automatically renders a confirmation dialog (Create stream / Cancel) using \`confirmation_body\` — so the user always reviews and approves before the partition is created. Always populate \`confirmation_body\` with a clear Markdown preview (parent, new child name, routing condition, expected impact).

    **When to call:** When the user has given a direct instruction to create or apply a partition — e.g. "create a partition for errors", "split this stream by service", "route nginx logs out", or after the user accepts a suggestion produced by the partition-suggestion read tool. Do NOT ask in chat for confirmation first when intent is clear; the platform dialog is the user's confirmation step. When applying multiple suggested partitions at once, call this tool once per partition — each renders its own dialog so the user can accept some and reject others.

    **When NOT to call:** When the user's message is exploratory ("how should I split this?", "what splits make sense?") or when partition suggestions came back with a \`reason\` (\`no_clusters\`, \`no_samples\`, \`all_data_partitioned\`) — present those in chat instead. See the confidence check rules in the streams skill prompt.

    **Cancellation:** If this tool returns "The user chose not to proceed with this action", acknowledge that partition is skipped. Continue with any other partitions the user requested. Do NOT retry the same partition with different parameters.

    Child names MUST follow the parent.childname convention: for parent "logs.ecs", use "logs.ecs.nginx"; for parent "logs.otel", use "logs.otel.nginx".

    Only works on wired streams. When creating multiple children under the same parent, call this tool sequentially (they modify the parent's routing table). Children under different parents can be created in parallel.
  `),
  tags: ['streams'],
  schema: createPartitionSchema,
  confirmation: {
    askUser: 'always',
    getConfirmation: ({ toolParams }) => ({
      title: i18n.translate('xpack.streams.agentBuilder.tools.forkStream.confirmTitle', {
        defaultMessage: 'Create child stream "{childName}"',
        values: { childName: toolParams.child_name },
      }),
      message: getConfirmationMessage(toolParams, 'confirmation_body'),
      confirm_text: i18n.translate(
        'xpack.streams.agentBuilder.tools.forkStream.confirmButtonLabel',
        { defaultMessage: 'Create stream' }
      ),
      color: 'primary' as const,
    }),
  },
  handler: async (
    { parent, child_name: childName, condition_json: conditionJson, status },
    { request }
  ) => {
    const signal = abortSignalFromRequest(request);
    const expectedPrefix = `${parent}.`;
    if (!childName.startsWith(expectedPrefix) || childName.length <= expectedPrefix.length) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Invalid child name "${childName}": must start with "${expectedPrefix}" (e.g. "${expectedPrefix}nginx"). Child streams follow the parent.childname naming convention.`,
              operation: 'create_partition',
              likely_cause: `The child name must be prefixed with the parent name. For parent "${parent}", use "${expectedPrefix}<suffix>".`,
            },
          },
        ],
      };
    }

    try {
      const { streamsClient } = await getScopedClients({ request });

      let parsed: unknown;
      try {
        parsed = JSON.parse(conditionJson);
      } catch {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Invalid condition JSON: ${conditionJson}`,
                operation: 'create_partition',
                likely_cause: 'The condition_json parameter must be a valid JSON string.',
              },
            },
          ],
        };
      }

      const validation = validateConditionJson(parsed);
      if (!validation.success) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Invalid routing condition: ${validation.error}`,
                operation: 'create_partition',
                likely_cause: 'invalid_condition',
              },
            },
          ],
        };
      }
      const condition = validation.data;

      const conditionStatus = status ?? (isNeverCondition(condition) ? 'disabled' : 'enabled');

      const result = await writeQueue.enqueue(
        () =>
          streamsClient.forkStream({
            parent,
            where: condition,
            name: childName,
            status: conditionStatus,
          }),
        signal
      );

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              success: true,
              parent,
              child: childName,
              status: conditionStatus,
              note: 'Child stream created. Routing takes effect for newly ingested documents only — existing documents remain in the parent stream.',
              result: result.result,
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
              message: `Failed to fork stream "${parent}" -> "${childName}": ${message}`,
              parent,
              child: childName,
              operation: 'create_partition',
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    }
  },
});
