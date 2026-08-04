import { z } from '@kbn/zod/v4';
export declare const captureBodySchema: z.ZodEnum<{
    all: "all";
    off: "off";
    errors: "errors";
    transactions: "transactions";
}>;
