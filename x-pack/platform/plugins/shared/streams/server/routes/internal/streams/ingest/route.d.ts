import { z } from '@kbn/zod/v4';
import type { ProcessorSuggestionsResponse } from '../../../../../common';
export declare const internalIngestRoutes: {
    "GET /internal/streams/ingest/processor_suggestions": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/ingest/processor_suggestions", z.ZodObject<{}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, ProcessorSuggestionsResponse, undefined>;
};
