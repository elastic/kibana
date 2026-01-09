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
    z.object({ operation: z.literal('current_user'), params: z.object({}) }),
    z.object({
        operation: z.literal('check_saved_objects'),
        params: z.object({
            namespace: z
                .string()
                .optional()
                .describe('Optional space/namespace to check against. Omit to use current space.'),
            checks: z
                .array(
                    z.object({
                        type: z.string().min(1).describe('Saved object type, e.g. "dashboard"'),
                        actions: z.array(z.enum(['read', 'write'])).min(1).describe('Actions to check'),
                    })
                )
                .min(1),
        }),
    }),
]);

export const privilegesTool = ({
    coreSetup,
}: {
    coreSetup: any;
}): BuiltinToolDefinition<typeof schema> => {
    return {
        id: platformCoreTools.privileges,
        type: ToolType.builtin,
        description:
            'Get current user info and check saved object privileges (read-only). Useful to explain permission errors.',
        schema,
        handler: async (input, { request }) => {
            const [coreStart, pluginsStart] = await coreSetup.getStartServices();
            const security = pluginsStart.security;
            const spaces = pluginsStart.spaces;

            switch (input.operation) {
                case 'current_user': {
                    const user = coreStart.security.authc.getCurrentUser(request);
                    const spaceId = spaces?.spacesService?.getSpaceId(request);
                    return { results: [{ type: 'other', data: { operation: 'current_user', item: { user, spaceId } } }] };
                }
                case 'check_saved_objects': {
                    if (!security?.authz) {
                        return { results: [{ type: 'error', data: { message: 'security authz not available' } }] };
                    }
                    const spaceId = spaces?.spacesService?.getSpaceId(request);
                    const namespace = input.params.namespace ?? spaceId;
                    const check = security.authz.checkSavedObjectsPrivilegesWithRequest(request);

                    const actions = input.params.checks.flatMap((c) =>
                        c.actions.map((a) => security.authz.actions.savedObject.get(c.type, a))
                    );

                    const res = await check(actions, namespace);
                    return {
                        results: [
                            {
                                type: 'other',
                                data: {
                                    operation: 'check_saved_objects',
                                    namespace,
                                    requested: input.params.checks,
                                    raw: res,
                                },
                            },
                        ],
                    };
                }
            }
        },
        tags: [],
    };
};


