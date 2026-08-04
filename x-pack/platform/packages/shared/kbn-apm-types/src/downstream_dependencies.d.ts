import { z } from '@kbn/zod/v4';
export declare const downstreamDependenciesRouteRt: z.ZodObject<{
    serviceName: z.ZodString;
    start: z.ZodString;
    end: z.ZodString;
    serviceEnvironment: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export interface APMDownstreamDependency {
    'service.name'?: string;
    'span.destination.service.resource': string;
    'span.type'?: string;
    'span.subtype'?: string;
    errorRate?: number;
    latencyMs?: number;
    throughputPerMin?: number;
}
