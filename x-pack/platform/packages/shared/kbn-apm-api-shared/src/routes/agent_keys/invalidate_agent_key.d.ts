import { z } from '@kbn/zod/v4';
export interface InvalidateAgentKeyResponse {
    invalidatedAgentKeys: string[];
}
export declare const invalidateAgentKeyRoute: {
    endpoint: "POST /internal/apm/api_key/invalidate";
    params?: z.ZodObject<{
        body: z.ZodObject<{
            id: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<InvalidateAgentKeyResponse>;
