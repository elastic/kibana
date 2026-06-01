import * as t from 'io-ts';
export declare const downstreamDependenciesRouteRt: t.IntersectionC<[t.TypeC<{
    serviceName: t.StringC;
    start: t.StringC;
    end: t.StringC;
}>, t.PartialC<{
    serviceEnvironment: t.StringC;
}>]>;
export interface APMDownstreamDependency {
    'service.name'?: string;
    'span.destination.service.resource': string;
    'span.type'?: string;
    'span.subtype'?: string;
    errorRate?: number;
    latencyMs?: number;
    throughputPerMin?: number;
}
