import { z } from '@kbn/zod/v4';
export interface ServiceNodeMetadataResponse {
    host: string | number;
    containerId: string | number;
}
export declare const serviceNodeMetadataRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/node/{serviceNodeName}/metadata";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
            serviceNodeName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            documentType: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, z.ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, z.ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, z.ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, z.ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, z.ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceNodeMetadataResponse>;
