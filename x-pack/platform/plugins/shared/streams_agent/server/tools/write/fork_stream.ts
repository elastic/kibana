/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { Condition } from '@kbn/streamlang';
import type { StreamsAgentCoreSetup } from '../../types';
import { getScopedStreamsClients } from '../get_scoped_clients';

export const STREAMS_FORK_STREAM_TOOL_ID = 'streams.fork_stream';

const forkStreamSchema = z.object({
  parent: z.string().min(1).describe('The name of the parent stream to fork from (e.g. "logs")'),
  name: z
    .string()
    .min(1)
    .describe('The name of the new child stream (e.g. "logs.nginx")'),
  conditionField: z.string().min(1).describe('The field to match on (e.g. "service.name")'),
  conditionOperator: z
    .enum(['eq', 'neq', 'contains', 'startsWith', 'endsWith', 'gt', 'gte', 'lt', 'lte', 'exists'])
    .describe('The comparison operator'),
  conditionValue: z
    .string()
    .optional()
    .describe('The value to compare against (not needed for "exists" operator)'),
});

export function createForkStreamTool({
  core,
}: {
  core: StreamsAgentCoreSetup;
}): StaticToolRegistration<typeof forkStreamSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof forkStreamSchema> = {
    id: STREAMS_FORK_STREAM_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Creates a new child stream (partition) from a parent wired stream with a routing condition. Documents matching the condition will be routed to the child stream. IMPORTANT: Always preview and get user confirmation before calling.',
    tags: ['streams'],
    schema: forkStreamSchema,
    handler: async (toolParams, context) => {
      const { parent, name, conditionField, conditionOperator, conditionValue } = toolParams;
      const { request, logger } = context;
      try {
        const { streamsClient } = await getScopedStreamsClients({ core, request });

        const condition: Condition = conditionOperator === 'exists'
          ? { field: conditionField, exists: true }
          : { field: conditionField, [conditionOperator]: conditionValue };

        await streamsClient.forkStream({
          parent,
          name,
          where: condition,
          status: 'enabled',
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: `Successfully created child stream "${name}" under "${parent}"`,
                parent,
                child: name,
                condition,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`streams.fork_stream tool error: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to create child stream "${name}": ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
