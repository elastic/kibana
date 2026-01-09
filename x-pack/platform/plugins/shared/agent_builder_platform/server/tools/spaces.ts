/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType, platformCoreTools } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';

const schema = z.discriminatedUnion('operation', [
    z.object({
        operation: z.literal('list'),
        params: z.object({
            purpose: z
                .enum(['any', 'copySavedObjectsIntoSpace', 'findSavedObjects', 'shareSavedObjectsIntoSpace'])
                .optional()
                .default('any')
                .describe('Spaces list purpose (affects filtering).'),
        }),
    }),
    z.object({
        operation: z.literal('get'),
        params: z.object({
            id: z.string().min(1).describe('Space id'),
        }),
    }),
    z.object({
        operation: z.literal('get_active'),
        params: z.object({}),
    }),
]);

export const spacesTool = ({ coreSetup }: { coreSetup: any }): BuiltinToolDefinition<typeof schema> => {
    return {
        id: platformCoreTools.spaces,
        type: ToolType.builtin,
        description: 'List/get spaces and get the active space for the current request (read-only).',
        schema,
        handler: async (input, { request }) => {
            const [, pluginsStart] = await coreSetup.getStartServices();
            const spaces = pluginsStart.spaces;
            if (!spaces) {
                return { results: [{ type: 'error', data: { message: 'spaces plugin not available' } }] };
            }

            const spacesClient = spaces.spacesService.createSpacesClient(request);

            switch (input.operation) {
                case 'list': {
                    const res = await spacesClient.getAll({ purpose: input.params.purpose });
                    return { results: [{ type: 'other', data: { operation: 'list', items: res } }] };
                }
                case 'get': {
                    const res = await spacesClient.get(input.params.id);
                    return { results: [{ type: 'other', data: { operation: 'get', item: res } }] };
                }
                case 'get_active': {
                    const res = await spaces.spacesService.getActiveSpace(request);
                    return { results: [{ type: 'other', data: { operation: 'get_active', item: res } }] };
                }
            }
        },
        tags: [],
    };
};


