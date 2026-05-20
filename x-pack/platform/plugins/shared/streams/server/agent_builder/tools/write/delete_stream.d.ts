import type { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { GetScopedClients } from '../../../routes/types';
import { type StreamsWriteQueue } from '../../utils/write_queue';
declare const deleteStreamSchema: z.ZodObject<{
    name: z.ZodString;
    confirmation_body: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const createDeleteStreamTool: ({ getScopedClients, writeQueue, }: {
    getScopedClients: GetScopedClients;
    writeQueue: StreamsWriteQueue;
}) => BuiltinToolDefinition<typeof deleteStreamSchema>;
export {};
