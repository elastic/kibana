import { z } from '@kbn/zod/v4';
import type { Transaction, APMError } from '@kbn/apm-types';
export interface ErrorSampleDetailsResponse {
    transaction: Transaction | undefined;
    error: Omit<APMError, 'transaction' | 'error'> & {
        transaction?: {
            id?: string;
            type?: string;
        };
        user_agent?: {
            name?: string;
            version?: string;
        };
        error: {
            id: string;
        } & Omit<APMError['error'], 'exception' | 'log'> & {
            exception?: APMError['error']['exception'];
            log?: APMError['error']['log'];
        };
    };
}
export declare const errorSampleDetailsRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/errors/{groupId}/error/{errorId}";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
            groupId: z.ZodString;
            errorId: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ErrorSampleDetailsResponse>;
