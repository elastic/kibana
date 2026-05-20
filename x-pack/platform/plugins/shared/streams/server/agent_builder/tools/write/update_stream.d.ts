import type { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { GetScopedClients } from '../../../routes/types';
import { type StreamsWriteQueue } from '../../utils/write_queue';
declare const updateStreamSchema: z.ZodObject<{
    name: z.ZodString;
    changes: z.ZodObject<{
        processing: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
        description: z.ZodOptional<z.ZodString>;
        lifecycle: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<{
                inherit: "inherit";
                ilm: "ilm";
                dsl: "dsl";
            }>;
            data_retention: z.ZodOptional<z.ZodString>;
            ilm_policy: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        fields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            type: z.ZodString;
        }, z.core.$strip>>>;
        failure_store: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<{
                inherit: "inherit";
                disabled: "disabled";
                enabled: "enabled";
                enabled_no_lifecycle: "enabled_no_lifecycle";
            }>;
            data_retention: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    confirmation_body: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const createUpdateStreamTool: ({ getScopedClients, writeQueue, }: {
    getScopedClients: GetScopedClients;
    writeQueue: StreamsWriteQueue;
}) => BuiltinToolDefinition<typeof updateStreamSchema>;
export {};
