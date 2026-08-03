import { z } from '@kbn/zod/v4';
import type { Agent, Service, Container, Kubernetes, Host, Cloud } from '@kbn/apm-types';
export interface ServiceInstanceMetadataDetailsResponse {
    '@timestamp': string;
    agent?: Agent;
    service?: Service;
    container?: Container;
    kubernetes?: Kubernetes;
    host?: Host;
    cloud?: Cloud;
}
export type ServiceInstanceContainerMetadataDetails = {
    kubernetes: Kubernetes;
} | undefined;
export type ServiceInstancesMetadataDetailsRouteResponse = ServiceInstanceMetadataDetailsResponse & (ServiceInstanceContainerMetadataDetails | {});
export declare const serviceInstancesMetadataDetailsRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
            serviceNodeName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceInstancesMetadataDetailsRouteResponse>;
