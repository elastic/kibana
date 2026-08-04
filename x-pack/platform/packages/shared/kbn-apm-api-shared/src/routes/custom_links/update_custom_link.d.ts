import { z } from '@kbn/zod/v4';
export declare const updateCustomLinkRoute: {
    endpoint: "PUT /internal/apm/settings/custom_links/{id}";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            id: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
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
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<void>;
