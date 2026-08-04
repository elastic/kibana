import { z } from '@kbn/zod/v4';
export declare const logLevelSchema: z.ZodEnum<{
    trace: "trace";
    error: "error";
    info: "info";
    warning: "warning";
    off: "off";
    debug: "debug";
    critical: "critical";
}>;
