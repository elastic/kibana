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
import { STREAMS_FORK_STREAM_TOOL_ID } from '../tool_ids';
import { classifyError } from '../error_utils';
import { validateConditionJson } from '../format_validation_errors';
import { getConfirmationMessage } from './confirmation_helpers';
import { type StreamsWriteQueue, abortSignalFromRequest } from '../write_queue';

const forkStreamSchema = z.object({
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
  change_description: z
    .string()
    .optional()
    .describe(
      'Markdown summary of the new child stream for the user confirmation prompt. Include parent hierarchy, existing children, the new child name, and the routing condition.'
    ),
});

export const createForkStreamTool = ({
  getScopedClients,
  writeQueue,
}: {
  getScopedClients: GetScopedClients;
  writeQueue: StreamsWriteQueue;
}): BuiltinToolDefinition<typeof forkStreamSchema> => ({
  id: STREAMS_FORK_STREAM_TOOL_ID,
  type: ToolType.builtin,
  description: dedent(`
    Creates a child stream (partition) under a parent wired stream with a routing condition.
    Documents matching the condition are routed from the parent to the new child stream.

    Child names MUST follow the parent.childname convention: for parent "logs.ecs", use "logs.ecs.nginx"; for parent "logs.otel", use "logs.otel.nginx".

    Only works on wired streams. When creating multiple children under the same parent, call this tool sequentially (they modify the parent's routing table). Children under different parents can be created in parallel.
  `),
  tags: ['streams', 'management'],
  schema: forkStreamSchema,
  confirmation: {
    askUser: 'always',
    getConfirmation: ({ toolParams }) => ({
      title: i18n.translate('xpack.streams.agentBuilder.tools.forkStream.confirmTitle', {
        defaultMessage: 'Create child stream "{childName}"',
        values: { childName: toolParams.child_name },
      }),
      message: getConfirmationMessage(toolParams, 'change_description'),
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
              operation: 'fork_stream',
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
                operation: 'fork_stream',
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
                operation: 'fork_stream',
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
              operation: 'fork_stream',
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    }
  },
});
