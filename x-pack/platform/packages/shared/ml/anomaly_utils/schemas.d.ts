import { z } from '@kbn/zod/v4';
import { ML_ENTITY_FIELD_TYPE } from './anomaly_utils';
export declare const influencerSchema: z.ZodObject<{
    fieldName: z.ZodString;
    fieldValue: z.ZodAny;
}, z.core.$strict>;
export declare const criteriaFieldSchema: z.ZodObject<{
    fieldName: z.ZodString;
    fieldValue: z.ZodAny;
    fieldType: z.ZodOptional<z.ZodEnum<typeof ML_ENTITY_FIELD_TYPE>>;
}, z.core.$strict>;
export declare const mlEntityFieldValueSchema: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
export declare const mlEntityFieldSchema: z.ZodObject<{
    fieldName: z.ZodString;
    fieldValue: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
    fieldType: z.ZodOptional<z.ZodEnum<typeof ML_ENTITY_FIELD_TYPE>>;
    operation: z.ZodOptional<z.ZodEnum<{
        readonly ADD: '+';
        readonly REMOVE: '-';
    }>>;
    cardinality: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
