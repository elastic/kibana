import { z } from '@kbn/zod/v4';
import { type StreamCandidate, type StreamClassificationResult } from './classify_streams';
export interface EligibleStreamsResponse {
    candidates: StreamCandidate[];
    alreadyRunning: StreamClassificationResult['alreadyRunning'];
    upToDate: StreamCandidate[];
    excluded: string[];
    unsupported: string[];
    skipped: StreamCandidate[];
    settings: {
        enabled: boolean;
        intervalHours: number;
        excludePatterns: string[];
    };
    connectorId: string;
    timeRange: {
        from: string;
        to: string;
    };
}
export declare const internalEligibleStreamsRoutes: {
    "GET /internal/streams/_extraction/_eligible": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/_extraction/_eligible", z.ZodObject<{
        query: z.ZodOptional<z.ZodObject<{
            maxScheduledStreams: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<number | undefined, string>>, z.ZodOptional<z.ZodNumber>>;
            extractionIntervalHours: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<number | undefined, string>>, z.ZodOptional<z.ZodNumber>>;
            lookbackHours: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<number | undefined, string>>, z.ZodOptional<z.ZodNumber>>;
            excludedStreamPatterns: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, EligibleStreamsResponse, undefined>;
};
