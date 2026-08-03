import { z } from '@kbn/zod/v4';
import type { SloStatus } from '@kbn/apm-types';
import type { ServiceAlertsResponse } from '../services/service_alerts_count';
export type ServiceSloStatsResponse = Array<{
    serviceName: string;
    sloStatus: SloStatus;
    sloCount: number;
}>;
export interface ServiceMapServiceBadgesResponse {
    alerts: ServiceAlertsResponse;
    slos: ServiceSloStatsResponse;
}
export declare const serviceMapServiceBadgesRoute: {
    endpoint: "POST /internal/apm/service-map/service_badges";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            kuery: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        body: z.ZodObject<{
            serviceNames: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<any, string>>, z.ZodArray<z.ZodString>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceMapServiceBadgesResponse>;
