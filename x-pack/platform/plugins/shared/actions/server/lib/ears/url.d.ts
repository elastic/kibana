export declare function resolveEarsUrl(urlPath: string, earsBaseUrl: string | undefined): string;
export interface EarsEndpoints {
    authorizeEndpoint: string;
    tokenEndpoint: string;
    refreshEndpoint: string;
}
export declare function getEarsEndpointsForProvider(provider: string | undefined): EarsEndpoints;
