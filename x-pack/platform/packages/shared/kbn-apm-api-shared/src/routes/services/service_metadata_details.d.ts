import { z } from '@kbn/zod/v4';
export interface ServiceMetadataDetails {
    service?: {
        versions?: string[];
        runtime?: {
            name?: string;
            version?: string;
        };
        framework?: string;
        agent: {
            name: string;
            version: string;
        };
    };
    opentelemetry?: {
        language?: string;
        sdkVersion?: string;
        autoVersion?: string;
    };
    container?: {
        ids?: string[];
        image?: string;
        os?: string;
        totalNumberInstances?: number;
    };
    serverless?: {
        type?: string;
        functionNames?: string[];
        faasTriggerTypes?: string[];
        hostArchitecture?: string;
    };
    cloud?: {
        provider?: string;
        availabilityZones?: string[];
        regions?: string[];
        machineTypes?: string[];
        projectName?: string;
        serviceName?: string;
    };
    kubernetes?: {
        deployments?: string[];
        namespaces?: string[];
        replicasets?: string[];
        containerImages?: string[];
    };
}
export declare const serviceMetadataDetailsRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/metadata/details";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceMetadataDetails>;
