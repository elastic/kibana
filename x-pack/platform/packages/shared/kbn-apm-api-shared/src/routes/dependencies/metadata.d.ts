import { z } from '@kbn/zod/v4';
export interface MetadataForDependencyResponse {
    spanType: string | undefined;
    spanSubtype: string | undefined;
}
export interface DependencyMetadataRouteResponse {
    metadata: MetadataForDependencyResponse;
}
export declare const dependencyMetadataRoute: {
    endpoint: "GET /internal/apm/dependencies/metadata";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            dependencyName: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<DependencyMetadataRouteResponse>;
