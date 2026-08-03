import { z } from '@kbn/zod/v4';
import type { ContainerType, ServerlessType } from '@kbn/apm-types';
export interface ServiceMetadataIcons {
    agentName?: string;
    containerType?: ContainerType;
    serverlessType?: ServerlessType;
    cloudProvider?: string;
}
export declare const serviceMetadataIconsRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/metadata/icons";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceMetadataIcons>;
