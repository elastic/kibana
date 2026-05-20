import type { z } from '@kbn/zod/v4';
export declare const searchModeSchema: z.ZodOptional<z.ZodEnum<{
    keyword: "keyword";
    semantic: "semantic";
    hybrid: "hybrid";
}>>;
