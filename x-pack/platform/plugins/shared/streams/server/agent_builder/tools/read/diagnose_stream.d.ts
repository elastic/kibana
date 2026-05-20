import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { GetScopedClients } from '../../../routes/types';
declare const diagnoseStreamSchema: z.ZodObject<{
    name: z.ZodString;
    time_range: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const createDiagnoseStreamTool: ({ getScopedClients, isServerless, logger, }: {
    getScopedClients: GetScopedClients;
    isServerless: boolean;
    logger: Logger;
}) => BuiltinToolDefinition<typeof diagnoseStreamSchema>;
export {};
