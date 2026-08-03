import type { HttpStart } from '@kbn/core/public';
export interface CheckSecurityFeaturesResponse {
    canReadSecurity: boolean;
    canUseInlineScripts: boolean;
    canUseStoredScripts: boolean;
    hasCompatibleRealms: boolean;
    canUseRemoteIndices: boolean;
    canUseRemoteClusters: boolean;
}
export declare class SecurityFeaturesAPIClient {
    private readonly http;
    constructor(http: HttpStart);
    checkFeatures(): Promise<CheckSecurityFeaturesResponse>;
}
