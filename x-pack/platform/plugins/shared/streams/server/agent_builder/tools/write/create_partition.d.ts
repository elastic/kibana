import { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { GetScopedClients } from '../../../routes/types';
import { type StreamsWriteQueue } from '../../utils/write_queue';
declare const createPartitionSchema: z.ZodObject<{
    parent: z.ZodString;
    child_name: z.ZodString;
    condition_json: z.ZodString;
    status: z.ZodEnum<{
        disabled: "disabled";
        enabled: "enabled";
    }>;
    confirmation_body: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const createCreatePartitionTool: ({ getScopedClients, writeQueue, }: {
    getScopedClients: GetScopedClients;
    writeQueue: StreamsWriteQueue;
}) => BuiltinToolDefinition<typeof createPartitionSchema>;
export {};
