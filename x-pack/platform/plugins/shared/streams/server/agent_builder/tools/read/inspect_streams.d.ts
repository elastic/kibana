import { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { GetScopedClients } from '../../../routes/types';
declare const inspectStreamsSchema: z.ZodObject<{
    names: z.ZodArray<z.ZodString>;
    aspects: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodEnum<{
        schema: "schema";
        routing: "routing";
        overview: "overview";
        lifecycle: "lifecycle";
        processing: "processing";
        quality: "quality";
    }>>>>;
}, z.core.$strip>;
export declare const createInspectStreamsTool: ({ getScopedClients, isServerless, }: {
    getScopedClients: GetScopedClients;
    isServerless: boolean;
}) => BuiltinToolDefinition<typeof inspectStreamsSchema>;
export {};
