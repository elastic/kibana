import { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { GetScopedClients } from '../../../routes/types';
declare const designPipelineSchema: z.ZodObject<{
    stream_name: z.ZodString;
    instruction: z.ZodString;
    samples: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        source: z.ZodLiteral<"stream">;
        size: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        source: z.ZodLiteral<"inline">;
        documents: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        status: z.ZodEnum<{
            processed: "processed";
            unprocessed: "unprocessed";
        }>;
    }, z.core.$strip>]>>;
}, z.core.$strip>;
export declare const createDesignPipelineTool: ({ getScopedClients, }: {
    getScopedClients: GetScopedClients;
}) => BuiltinToolDefinition<typeof designPipelineSchema>;
export {};
