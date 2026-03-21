import { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import type { IFileStore } from '@kbn/agent-builder-server/runner/filestore';
declare const schema: z.ZodObject<{
    path: z.ZodString;
    raw: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const readTool: ({ filestore, }: {
    filestore: IFileStore;
}) => BuiltinToolDefinition<typeof schema>;
export {};
