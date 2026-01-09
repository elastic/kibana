/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolResultType, ToolType, platformCoreTools } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';

const findSchema = z.object({
    type: z.string().describe('Saved object type'),
    search: z.string().optional().describe('Optional search string'),
    perPage: z.number().int().min(1).max(200).optional().default(20),
    page: z.number().int().min(1).optional().default(1),
    sortField: z.string().optional().describe('Optional sort field (e.g., "updated_at")'),
    sortOrder: z.enum(['asc', 'desc']).optional().describe('Optional sort order (asc|desc)'),
});

const getSchema = z.object({
    type: z.string().describe('Saved object type'),
    id: z.string().describe('Saved object id'),
});

const referencesSchema = z.array(z.object({ type: z.string(), id: z.string(), name: z.string() }));

const createSchema = z.object({
    type: z.string().describe('Saved object type'),
    attributes: z.record(z.unknown()).describe('Attributes to create'),
    references: z
        .array(z.object({ type: z.string(), id: z.string(), name: z.string() }))
        .optional()
        .default([]),
    confirm: z
        .literal(true)
        .describe('Required for write operations. Set to true only if the user explicitly confirmed.'),
});

const updateSchema = z.object({
    type: z.string().describe('Saved object type'),
    id: z.string().describe('Saved object id'),
    attributes: z.record(z.unknown()).describe('Attributes to update'),
    confirm: z
        .literal(true)
        .describe('Required for write operations. Set to true only if the user explicitly confirmed.'),
});

/**
 * LLM-tolerant schema (must be a ZodObject for BuiltinToolDefinition typing).
 * Accepts both:
 * - Preferred: `{ operation, params: { ... } }`
 * - Compat: `{ operation, ...params }`
 *
 * We validate the exact params shape inside the handler using `findSchema/getSchema/...`.
 */
const schema = z.object({
    operation: z.enum(['find', 'get', 'create', 'update']),
    // Preferred wrapper
    params: z.record(z.unknown()).optional().describe('Preferred params wrapper object'),
    // Flattened compat fields
    type: z.string().optional(),
    search: z.string().optional(),
    perPage: z.number().int().min(1).max(200).optional(),
    page: z.number().int().min(1).optional(),
    sortField: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    id: z.string().optional(),
    attributes: z.record(z.unknown()).optional(),
    references: referencesSchema.optional(),
    confirm: z.literal(true).optional(),
});

export const savedObjectsTool = ({
    coreSetup,
}: {
    coreSetup: any;
}): BuiltinToolDefinition<typeof schema> => {
    return {
        id: platformCoreTools.savedObjects,
        type: ToolType.builtin,
        description: 'Find/get/create/update Kibana saved objects (no delete).',
        schema,
        handler: async (input, { request }) => {
            const [coreStart] = await coreSetup.getStartServices();
            const client = coreStart.savedObjects.getScopedClient(request);

            const asAny = input as any;
            const { operation, params: paramsRaw, ...rest } = asAny ?? {};
            const candidate = (paramsRaw ?? rest) as Record<string, unknown>;

            switch (operation as typeof input.operation) {
                case 'find': {
                    const { type, search, perPage, page, sortField, sortOrder } = findSchema.parse(candidate);
                    const res = await client.find({ type, search, perPage, page, sortField, sortOrder });
                    return {
                        results: [
                            {
                                type: ToolResultType.other,
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
                    const { type, id } = getSchema.parse(candidate);
                    const res = await client.get(type, id);
                    return {
                        results: [{ type: ToolResultType.other, data: { operation: 'get', item: res } }],
                    };
                }
                case 'create': {
                    const { type, attributes, references } = createSchema.parse(candidate);
                    const res = await client.create(type, attributes, { references });
                    return {
                        results: [{ type: ToolResultType.other, data: { operation: 'create', item: res } }],
                    };
                }
                case 'update': {
                    const { type, id, attributes } = updateSchema.parse(candidate);
                    const current = await client.get(type, id);
                    const res = await client.update(type, id, attributes, { version: current.version });
                    return {
                        results: [{ type: ToolResultType.other, data: { operation: 'update', item: res } }],
                    };
                }
            }
        },
        tags: [],
    };
};


