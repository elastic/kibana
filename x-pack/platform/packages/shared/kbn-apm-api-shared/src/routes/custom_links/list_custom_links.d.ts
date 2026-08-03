import { z } from '@kbn/zod/v4';
import type { CustomLink } from '@kbn/apm-types';
export interface ListCustomLinksResponse {
    customLinks: CustomLink[];
}
export declare const listCustomLinksRoute: {
    endpoint: "GET /internal/apm/settings/custom_links";
    params?: z.ZodObject<{
        query: z.ZodOptional<z.ZodObject<{
            'service.name': z.ZodOptional<z.ZodString>;
            'service.environment': z.ZodOptional<z.ZodString>;
            'transaction.name': z.ZodOptional<z.ZodString>;
            'transaction.type': z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ListCustomLinksResponse>;
