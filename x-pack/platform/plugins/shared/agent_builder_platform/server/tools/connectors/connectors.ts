/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType, platformCoreTools } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';

const listSchema = z.object({
    perPage: z.number().int().min(1).max(200).optional().default(200),
});

const getSchema = z.object({
    id: z.string().describe('Connector id'),
});

const schema = z.discriminatedUnion('operation', [
    z.object({ operation: z.literal('list'), params: listSchema }),
    z.object({ operation: z.literal('get'), params: getSchema }),
]);

export const connectorsTool = ({ coreSetup }: { coreSetup: any }): BuiltinToolDefinition<typeof schema> => {
    return {
        id: platformCoreTools.connectors,
        type: ToolType.builtin,
        description: 'List/get action connectors (read-only).',
        schema,
        handler: async (input, { request }) => {
            const [, pluginsStart] = await coreSetup.getStartServices();
            const actionsClient = await pluginsStart.actions?.getActionsClientWithRequest(request);
            if (!actionsClient) {
                return { results: [{ type: 'error', data: { message: 'actions plugin not available' } }] };
            }

            switch (input.operation) {
                case 'list': {
                    const res = await actionsClient.getAll();
                    return { results: [{ type: 'other', data: { operation: 'list', items: res } }] };
                }
                case 'get': {
                    const res = await actionsClient.get({ id: input.params.id });
                    return { results: [{ type: 'other', data: { operation: 'get', item: res } }] };
                }
            }
        },
        tags: [],
    };
};


