import { z } from '@kbn/zod/v4';
export declare const traceContinuationStrategySchema: z.ZodEnum<{
    restart: "restart";
    continue: "continue";
    restart_external: "restart_external";
}>;
