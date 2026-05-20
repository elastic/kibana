import type { SharePublicSetup, SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { MlLocatorParams } from '@kbn/ml-common-types/locator';
/**
 * This class is meant as a wrapper for the Management Locator.
 * This will ensure url formatting is consistent with what it was prior to being moved to the Management section.
 */
export declare class MlManagementLocatorInternal {
    private _locator;
    private _sectionId;
    private validPaths;
    constructor(share: SharePublicStart | SharePublicSetup);
    private getPath;
    readonly getUrl: (params: MlLocatorParams | undefined, appId?: string) => Promise<{
        path: string;
        url: string | undefined;
    }>;
    readonly getRedirectUrl: (params: MlLocatorParams, appId?: string) => {
        path: string;
        url: string | undefined;
    };
    readonly navigate: (path: string, appId?: string) => Promise<void>;
}
