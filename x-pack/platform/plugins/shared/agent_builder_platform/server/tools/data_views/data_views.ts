/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType, platformCoreTools } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';

/**
 * Data views are stored as saved objects of type `index-pattern`.
 * This tool provides safe find/get/create/update access without relying on the dataViews plugin.
 */
const INDEX_PATTERN_SO_TYPE = 'index-pattern';

const findSchema = z.object({
    search: z.string().optional().describe('Optional search string (title/name)'),
    perPage: z.number().int().min(1).max(200).optional().default(50),
    page: z.number().int().min(1).optional().default(1),
});

const getSchema = z.object({
    id: z.string().describe('Data view (index-pattern saved object) id'),
});

const createSchema = z.object({
    title: z.string().describe('Index pattern title, e.g. logs-*'),
    name: z.string().optional().describe('Optional display name'),
    timeFieldName: z.string().optional().describe('Optional time field'),
    confirm: z
        .literal(true)
        .describe('Required for write operations. Set to true only if the user explicitly confirmed.'),
});

const updateSchema = z.object({
    id: z.string().describe('Data view id'),
    title: z.string().optional(),
    name: z.string().optional(),
    timeFieldName: z.string().optional(),
    confirm: z
        .literal(true)
        .describe('Required for write operations. Set to true only if the user explicitly confirmed.'),
});

const schema = z.discriminatedUnion('operation', [
    z.object({ operation: z.literal('find'), params: findSchema }),
    z.object({ operation: z.literal('get'), params: getSchema }),
    z.object({ operation: z.literal('create'), params: createSchema }),
    z.object({ operation: z.literal('update'), params: updateSchema }),
]);

export const dataViewsTool = ({
    coreSetup,
}: {
    coreSetup: any;
}): BuiltinToolDefinition<typeof schema> => {
    return {
        id: platformCoreTools.dataViews,
        type: ToolType.builtin,
        description: 'Find/get/create/update data views (index patterns) via saved objects (no delete).',
        schema,
        handler: async (input, { request }) => {
            const [coreStart] = await coreSetup.getStartServices();
            const client = coreStart.savedObjects.getScopedClient(request);

            switch (input.operation) {
                case 'find': {
                    const res = await client.find({
                        type: INDEX_PATTERN_SO_TYPE,
                        search: input.params.search,
                        perPage: input.params.perPage,
                        page: input.params.page,
                    });
                    return {
                        results: [
                            {
                                type: 'other',
                                data: {
                                    operation: 'find',
                                    items: res.saved_objects,
                                    total: res.total,
                                    perPage: res.per_page,
                                    page: res.page,
                                },
                            },
                        ],
                    };
                }
                case 'get': {
                    const res = await client.get(INDEX_PATTERN_SO_TYPE, input.params.id);
                    return { results: [{ type: 'other', data: { operation: 'get', item: res } }] };
                }
                case 'create': {
                    const { title, name, timeFieldName } = input.params;
                    const attributes = {
                        title,
                        name,
                        timeFieldName,
                    };
                    const res = await client.create(INDEX_PATTERN_SO_TYPE, attributes);
                    return { results: [{ type: 'other', data: { operation: 'create', item: res } }] };
                }
                case 'update': {
                    const current = await client.get(INDEX_PATTERN_SO_TYPE, input.params.id);
                    const attributes = {
                        ...(current.attributes as Record<string, unknown>),
                        ...(input.params.title !== undefined ? { title: input.params.title } : {}),
                        ...(input.params.name !== undefined ? { name: input.params.name } : {}),
                        ...(input.params.timeFieldName !== undefined
                            ? { timeFieldName: input.params.timeFieldName }
                            : {}),
                    };
                    const res = await client.update(INDEX_PATTERN_SO_TYPE, input.params.id, attributes, {
                        version: current.version,
                    });
                    return { results: [{ type: 'other', data: { operation: 'update', item: res } }] };
                }
            }
        },
        tags: [],
    };
};


