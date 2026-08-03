import { z } from '@kbn/zod/v4';
export interface DeleteCustomLinkResponse {
    result: string;
}
export declare const deleteCustomLinkRoute: {
    endpoint: "DELETE /internal/apm/settings/custom_links/{id}";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            id: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<DeleteCustomLinkResponse>;
