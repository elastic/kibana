import { z } from '@kbn/zod/v4';
import type { Transaction } from '@kbn/apm-types/es_schemas_ui';
export type CustomLinkTransactionResponse = Transaction;
export declare const customLinkTransactionRoute: {
    endpoint: "GET /internal/apm/settings/custom_links/transaction";
    params?: z.ZodObject<{
        query: z.ZodOptional<z.ZodObject<{
            'service.name': z.ZodOptional<z.ZodString>;
            'service.environment': z.ZodOptional<z.ZodString>;
            'transaction.name': z.ZodOptional<z.ZodString>;
            'transaction.type': z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<Transaction>;
