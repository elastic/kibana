import type { CoreSetup } from '@kbn/core/public';
import type { CloudConfigType } from '.';
import type { CloudBasicUrls, CloudPrivilegedUrls } from './types';
/**
 * Service that manages all URLs for the Cloud plugin.
 */
export declare class CloudUrlsService {
    private config?;
    private coreSetup?;
    private kibanaUrl?;
    setup(config: CloudConfigType, coreSetup: CoreSetup, kibanaUrl: string | undefined): void;
    /**
     * Returns the set of "basic" URLs. No special privileges needed
     */
    getUrls(): CloudBasicUrls;
    /**
     * Returns the set of "privilged" URLs. Each requires a specific privilege to access.
     */
    getPrivilegedUrls(): Promise<CloudPrivilegedUrls>;
    private getCoreStart;
    /**
     * Needed for determining access to privileged URLs, such as billing.
     */
    private getCurrentUserRoles;
}
