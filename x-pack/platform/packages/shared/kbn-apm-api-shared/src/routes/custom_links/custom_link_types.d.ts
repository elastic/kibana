import { z } from '@kbn/zod/v4';
export declare const filterOptionsSchema: z.ZodObject<{
    'service.name': z.ZodOptional<z.ZodString>;
    'service.environment': z.ZodOptional<z.ZodString>;
    'transaction.name': z.ZodOptional<z.ZodString>;
    'transaction.type': z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const payloadSchema: z.ZodObject<{
    label: z.ZodString;
    url: z.ZodString;
    id: z.ZodOptional<z.ZodString>;
    filters: z.ZodOptional<z.ZodArray<z.ZodObject<{
        key: z.ZodUnion<readonly [z.ZodLiteral<"">, z.ZodEnum<{
            "service.name": "service.name";
            "transaction.name": "transaction.name";
            "transaction.type": "transaction.type";
            "service.environment": "service.environment";
        }>]>;
        value: z.ZodString;
    }, z.core.$strip>>>;
}, z.core.$strip>;
