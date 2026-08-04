import { z } from '@kbn/zod/v4';
import type { ResolvedMetaFunctions } from './form';
export declare const extractSchemaCore: (schema: z.ZodType, meta: ResolvedMetaFunctions) => {
    schema: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
    defaultValue: unknown;
    isOptional: boolean;
};
