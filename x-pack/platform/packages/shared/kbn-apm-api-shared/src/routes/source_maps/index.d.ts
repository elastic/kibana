export declare const sourceMapsRouteDefinitions: {
    list: {
        endpoint: "GET /api/apm/sourcemaps 2023-10-31";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodOptional<import("zod").ZodObject<{
                page: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                perPage: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
            }, import("zod/v4/core").$strip>>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./list_source_maps").ListSourceMapArtifactsResponse | undefined>;
    delete: {
        endpoint: "DELETE /api/apm/sourcemaps/{id} 2023-10-31";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                id: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<void>;
    migrateFleetArtifacts: {
        endpoint: "POST /internal/apm/sourcemaps/migrate_fleet_artifacts";
        params?: undefined;
    } & import("../types").WithResponse<void>;
};
export { sourceMapSchema, type SourceMap, type ApmSourceMapArtifactBody } from './source_map_types';
export type { ListSourceMapArtifactsResponse } from './list_source_maps';
