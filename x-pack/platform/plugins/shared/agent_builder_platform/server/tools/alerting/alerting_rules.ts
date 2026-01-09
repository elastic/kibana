/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType, platformCoreTools } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';

const findSchema = z.object({
    search: z.string().optional().describe('Optional search text'),
    perPage: z.number().int().min(1).max(200).optional().default(50),
    page: z.number().int().min(1).optional().default(1),
});

const getSchema = z.object({
    id: z.string().describe('Rule id'),
});

const setEnabledSchema = z.object({
    id: z.string().describe('Rule id'),
    enabled: z.boolean().describe('Whether the rule should be enabled'),
    confirm: z
        .literal(true)
        .describe('Required for enable/disable. Set to true only if the user explicitly confirmed.'),
});

const schema = z.discriminatedUnion('operation', [
    z.object({ operation: z.literal('find'), params: findSchema }),
    z.object({ operation: z.literal('get'), params: getSchema }),
    z.object({ operation: z.literal('set_enabled'), params: setEnabledSchema }),
]);

export const alertingRulesTool = ({
    coreSetup,
}: {
    coreSetup: any;
}): BuiltinToolDefinition<typeof schema> => {
    return {
        id: platformCoreTools.alertingRules,
        type: ToolType.builtin,
        description: 'Find/get and enable/disable alerting rules (no delete).',
        schema,
        handler: async (input, { request }) => {
            const [, pluginsStart] = await coreSetup.getStartServices();
            const rulesClient = await pluginsStart.alerting?.getRulesClientWithRequest(request);
            if (!rulesClient) {
                return { results: [{ type: 'error', data: { message: 'alerting plugin not available' } }] };
            }

            switch (input.operation) {
                case 'find': {
                    const res = await rulesClient.find({ search: input.params.search, perPage: input.params.perPage, page: input.params.page });
                    return {
                        results: [
                            {
                                type: 'other',
                                data: {
                                    operation: 'find',
                                    items: res.data,
                                    total: res.total,
                                    page: res.page,
                                    perPage: res.perPage,
                                },
                            },
                        ],
                    };
                }
                case 'get': {
                    const res = await rulesClient.get({ id: input.params.id });
                    return { results: [{ type: 'other', data: { operation: 'get', item: res } }] };
                }
                case 'set_enabled': {
                    if (input.params.enabled) {
                        await rulesClient.enableRule({ id: input.params.id });
                    } else {
                        await rulesClient.disableRule({ id: input.params.id });
                    }
                    const res = await rulesClient.get({ id: input.params.id });
                    return { results: [{ type: 'other', data: { operation: 'set_enabled', item: res } }] };
                }
            }
        },
        tags: [],
    };
};


