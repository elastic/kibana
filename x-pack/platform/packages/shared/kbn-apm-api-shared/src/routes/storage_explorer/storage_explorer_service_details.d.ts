import { z } from '@kbn/zod/v4';
import type { ProcessorEvent } from '@kbn/apm-types-shared';
export interface StorageDetailsResponse {
    processorEventStats: Array<{
        processorEvent: ProcessorEvent;
        docs: number;
        size: number;
    }>;
    indicesStats: Array<{
        indexName: string;
        numberOfDocs: number;
        primary: string | number | undefined;
        replica: string | number | undefined;
        size: number | undefined;
        dataStream: string | undefined;
        lifecyclePhase: string | undefined;
    }>;
}
export declare const storageExplorerServiceDetailsRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/storage_details";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            indexLifecyclePhase: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.All>, z.ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Hot>, z.ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Warm>, z.ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Cold>, z.ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Frozen>]>;
            probability: z.ZodCoercedNumber<unknown>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<StorageDetailsResponse>;
