import { z } from '@kbn/zod/v4';
import type { UpsertStreamResponse } from '../../../lib/streams/client';
export declare const createClassicStreamRoute: Record<"POST /internal/streams/_create_classic", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/_create_classic", z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        ingest: z.ZodAny;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, UpsertStreamResponse, undefined>>;
