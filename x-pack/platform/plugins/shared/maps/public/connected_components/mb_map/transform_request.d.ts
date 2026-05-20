/**
 * @param pathOrUrl - Assumed to be a full URL or a path starting with "/"
 * @param resourceType - Indicator of what type of resource is being requested
 */
export declare function transformRequest(pathOrUrl: string, resourceType: string | undefined): {
    url: string;
    method: "GET";
    headers: {
        "elastic-api-version": string;
        "x-elastic-internal-origin": string;
    };
} | {
    url: string;
    method?: undefined;
    headers?: undefined;
};
