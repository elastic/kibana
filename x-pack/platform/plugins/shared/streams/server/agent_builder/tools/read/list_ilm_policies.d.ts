import { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { GetScopedClients } from '../../../routes/types';
declare const listIlmPoliciesSchema: z.ZodObject<{}, z.core.$strip>;
export declare const createListIlmPoliciesTool: ({ getScopedClients, isServerless, }: {
    getScopedClients: GetScopedClients;
    isServerless: boolean;
}) => BuiltinToolDefinition<typeof listIlmPoliciesSchema>;
export {};
