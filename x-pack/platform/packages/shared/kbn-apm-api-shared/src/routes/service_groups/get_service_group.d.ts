import { z } from '@kbn/zod/v4';
import type { SavedServiceGroup } from '@kbn/apm-types';
export interface ServiceGroupResponse {
    serviceGroup: SavedServiceGroup;
}
export declare const serviceGroupRoute: {
    endpoint: "GET /internal/apm/service-group";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            serviceGroup: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceGroupResponse>;
