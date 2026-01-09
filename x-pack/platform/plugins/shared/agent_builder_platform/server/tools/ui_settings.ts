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
        operation: z.literal('get'),
        params: z.object({
            key: z.string().min(1).describe('UI setting key, e.g. "dateFormat", "timepicker:timeDefaults"'),
            includeSensitive: z
                .boolean()
                .optional()
                .default(false)
                .describe('If false (default), sensitive keys are redacted.'),
        }),
    }),
    z.object({
        operation: z.literal('get_all'),
        params: z.object({
            keys: z.array(z.string().min(1)).optional().describe('Optional allow-list of keys to return'),
            includeSensitive: z
                .boolean()
                .optional()
                .default(false)
                .describe('If false (default), sensitive keys are redacted.'),
        }),
    }),
    z.object({
        operation: z.literal('get_user_provided'),
        params: z.object({
            includeSensitive: z
                .boolean()
                .optional()
                .default(false)
                .describe('If false (default), sensitive keys are redacted.'),
        }),
    }),
    z.object({
        operation: z.literal('get_registered'),
        params: z.object({}),
    }),
]);

export const uiSettingsTool = ({
    coreSetup,
}: {
    coreSetup: any;
}): BuiltinToolDefinition<typeof schema> => {
    return {
        id: platformCoreTools.uiSettings,
        type: ToolType.builtin,
        description: 'Read UI settings (advanced settings) for the current space/user (read-only).',
        schema,
        handler: async (input, { request }) => {
            const [coreStart] = await coreSetup.getStartServices();
            const soClient = coreStart.savedObjects.getScopedClient(request);
            const uiSettings = coreStart.uiSettings.asScopedToClient(soClient);

            const redactIfNeeded = (key: string, value: unknown, includeSensitive: boolean) => {
                if (!includeSensitive && uiSettings.isSensitive(key)) {
                    return '[sensitive]';
                }
                return value;
            };

            switch (input.operation) {
                case 'get': {
                    const value = await uiSettings.get(input.params.key);
                    return {
                        results: [
                            {
                                type: 'other',
                                data: {
                                    operation: 'get',
                                    item: {
                                        key: input.params.key,
                                        value: redactIfNeeded(input.params.key, value, input.params.includeSensitive),
                                        isOverridden: uiSettings.isOverridden(input.params.key),
                                        isSensitive: uiSettings.isSensitive(input.params.key),
                                    },
                                },
                            },
                        ],
                    };
                }
                case 'get_all': {
                    const all = await uiSettings.getAll();
                    const keys = input.params.keys ?? Object.keys(all);
                    const items = keys.map((key) => ({
                        key,
                        value: redactIfNeeded(key, all[key], input.params.includeSensitive),
                        isOverridden: uiSettings.isOverridden(key),
                        isSensitive: uiSettings.isSensitive(key),
                    }));
                    return { results: [{ type: 'other', data: { operation: 'get_all', items } }] };
                }
                case 'get_user_provided': {
                    const userProvided = await uiSettings.getUserProvided();
                    const items = Object.entries(userProvided).map(([key, v]) => ({
                        key,
                        userValue: redactIfNeeded(key, (v as any).userValue, input.params.includeSensitive),
                        isSensitive: uiSettings.isSensitive(key),
                    }));
                    return { results: [{ type: 'other', data: { operation: 'get_user_provided', items } }] };
                }
                case 'get_registered': {
                    const registered = uiSettings.getRegistered();
                    return { results: [{ type: 'other', data: { operation: 'get_registered', items: registered } }] };
                }
            }
        },
        tags: [],
    };
};



