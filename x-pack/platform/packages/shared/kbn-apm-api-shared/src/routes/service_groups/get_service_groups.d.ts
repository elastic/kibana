import type { SavedServiceGroup } from '@kbn/apm-types';
export interface ServiceGroupsResponse {
    serviceGroups: SavedServiceGroup[];
}
export declare const serviceGroupsRoute: {
    endpoint: "GET /internal/apm/service-groups";
    params?: undefined;
} & import("../types").WithResponse<ServiceGroupsResponse>;
