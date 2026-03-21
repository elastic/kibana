import { z } from '@kbn/zod/v4';
import type { IFileStore } from '@kbn/agent-builder-server/runner/filestore';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
declare const schema: z.ZodObject<{
    pattern: z.ZodString;
    globPattern: z.ZodString;
    context: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    fixed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const grepTool: ({ filestore, }: {
    filestore: IFileStore;
}) => BuiltinToolDefinition<typeof schema>;
export {};
