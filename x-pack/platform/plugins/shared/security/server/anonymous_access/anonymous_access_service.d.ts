import type { Capabilities } from '@kbn/core-capabilities-common';
import type { CapabilitiesStart } from '@kbn/core-capabilities-server';
import type { IClusterClient } from '@kbn/core-elasticsearch-server';
import type { IBasePath, KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { ConfigType } from '../config';
export interface AnonymousAccessServiceStart {
    readonly isAnonymousAccessEnabled: boolean;
    readonly accessURLParameters: Readonly<Map<string, string>> | null;
    getCapabilities: (request: KibanaRequest) => Promise<Capabilities>;
}
interface AnonymousAccessServiceStartParams {
    basePath: IBasePath;
    capabilities: CapabilitiesStart;
    clusterClient: IClusterClient;
    spaces?: SpacesServiceStart;
}
/**
 * Service that manages various aspects of the anonymous access.
 */
export declare class AnonymousAccessService {
    private readonly logger;
    private readonly getConfig;
    /**
     * Indicates whether anonymous access is enabled.
     */
    private isAnonymousAccessEnabled;
    /**
     * Defines HTTP authorization header that should be used to authenticate request.
     */
    private httpAuthorizationHeader;
    constructor(logger: Logger, getConfig: () => ConfigType);
    setup(): void;
    start({ basePath, capabilities, clusterClient, spaces, }: AnonymousAccessServiceStartParams): AnonymousAccessServiceStart;
    /**
     * Checks if anonymous service account can authenticate to Elasticsearch using currently configured credentials.
     * @param clusterClient
     */
    private canAuthenticateAnonymousServiceAccount;
    /**
     * Creates a fake Kibana request optionally attributed with the anonymous service account
     * credentials to get the list of capabilities.
     * @param authenticateRequest Indicates whether or not we should include authorization header with
     * anonymous service account credentials.
     */
    private createFakeAnonymousRequest;
}
export {};
