export declare const storageExplorerRouteDefinitions: {
    storageExplorer: {
        endpoint: "GET /internal/apm/storage_explorer";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                indexLifecyclePhase: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.All>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Hot>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Warm>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Cold>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Frozen>]>;
                probability: import("zod").ZodCoercedNumber<unknown>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./storage_explorer").StorageExplorerRouteResponse>;
    serviceDetails: {
        endpoint: "GET /internal/apm/services/{serviceName}/storage_details";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                indexLifecyclePhase: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.All>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Hot>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Warm>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Cold>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Frozen>]>;
                probability: import("zod").ZodCoercedNumber<unknown>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./storage_explorer_service_details").StorageDetailsResponse>;
    chart: {
        endpoint: "GET /internal/apm/storage_chart";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                indexLifecyclePhase: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.All>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Hot>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Warm>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Cold>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Frozen>]>;
                probability: import("zod").ZodCoercedNumber<unknown>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./storage_chart").StorageChartRouteResponse>;
    privileges: {
        endpoint: "GET /internal/apm/storage_explorer/privileges";
        params?: undefined;
    } & import("../types").WithResponse<import("./storage_explorer_privileges").StorageExplorerPrivilegesResponse>;
    summaryStats: {
        endpoint: "GET /internal/apm/storage_explorer_summary_stats";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                indexLifecyclePhase: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.All>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Hot>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Warm>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Cold>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Frozen>]>;
                probability: import("zod").ZodCoercedNumber<unknown>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./storage_explorer_summary_stats").StorageExplorerSummaryStatisticsResponse>;
    isCrossCluster: {
        endpoint: "GET /internal/apm/storage_explorer/is_cross_cluster_search";
        params?: undefined;
    } & import("../types").WithResponse<import("./storage_explorer_is_cross_cluster").StorageExplorerIsCrossClusterResponse>;
    getServices: {
        endpoint: "GET /internal/apm/storage_explorer/get_services";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                indexLifecyclePhase: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.All>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Hot>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Warm>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Cold>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Frozen>]>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./storage_explorer_get_services").StorageExplorerGetServicesResponse>;
};
export type { StorageExplorerServiceStatisticsResponse, StorageExplorerRouteResponse, } from './storage_explorer';
export type { StorageDetailsResponse } from './storage_explorer_service_details';
export type { SizeTimeseriesResponse, StorageChartRouteResponse } from './storage_chart';
export type { StorageExplorerPrivilegesResponse } from './storage_explorer_privileges';
export type { StorageExplorerSummaryStatisticsResponse } from './storage_explorer_summary_stats';
export type { StorageExplorerIsCrossClusterResponse } from './storage_explorer_is_cross_cluster';
export type { StorageExplorerGetServicesResponse } from './storage_explorer_get_services';
