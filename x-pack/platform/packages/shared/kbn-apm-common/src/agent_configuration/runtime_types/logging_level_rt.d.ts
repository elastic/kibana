import { z } from '@kbn/zod/v4';
export declare const loggingLevelSchema: z.ZodEnum<{
    trace: "trace";
    error: "error";
    info: "info";
    off: "off";
    debug: "debug";
    warn: "warn";
    fatal: "fatal";
}>;
