import { Readable } from 'stream';
import { z } from '@kbn/zod/v4';
import type { ContentPack } from '@kbn/content-packs-schema';
export declare const contentRoutes: {
    "POST /internal/streams/{name}/content/preview": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/content/preview", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            content: z.ZodCustom<Readable, Readable>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../types").StreamsRouteHandlerResources, ContentPack, undefined>;
    "POST /api/streams/{name}/content/import 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/{name}/content/import 2023-10-31", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            include: z.ZodPipe<z.ZodString, z.ZodTransform<import("@kbn/content-packs-schema").ContentPackIncludeAll | {
                objects: {
                    mappings: boolean;
                    queries: Array<{
                        id: string;
                    }>;
                    routing: Array<{
                        destination: string;
                    } & import("@kbn/content-packs-schema").ContentPackIncludedObjects>;
                };
            }, string>>;
            content: z.ZodCustom<Readable, Readable>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../types").StreamsRouteHandlerResources, {
        acknowledged: boolean;
        result: {
            created: string[];
            updated: string[];
        };
    }, undefined>;
    "POST /api/streams/{name}/content/export 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/{name}/content/export 2023-10-31", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            name: z.ZodString;
            description: z.ZodString;
            version: z.ZodString;
            include: z.ZodType<import("@kbn/content-packs-schema").ContentPackIncludedObjects, unknown, z.core.$ZodTypeInternals<import("@kbn/content-packs-schema").ContentPackIncludedObjects, unknown>>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../types").StreamsRouteHandlerResources, import("@kbn/core/server").IKibanaResponse<Buffer<ArrayBufferLike>>, undefined>;
};
