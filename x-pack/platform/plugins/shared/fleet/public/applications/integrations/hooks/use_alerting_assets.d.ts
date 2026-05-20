import type { KibanaAssetReference, SimpleSOAssetType } from '../../../../common';
import type { PackageInfo } from '../../../types';
type AlertingAssetsByType = Record<string, KibanaAssetReference[]>;
type AssetSavedObjectsByType = Record<string, Record<string, SimpleSOAssetType & {
    appLink?: string;
}>>;
type UserCreatedRule = SimpleSOAssetType & {
    appLink?: string;
};
export declare const useAlertingAssets: (packageInfo: PackageInfo) => {
    alertingAssets: KibanaAssetReference[];
    alertingAssetsByType: AlertingAssetsByType;
    deferredAlerts: KibanaAssetReference[];
    assetSavedObjectsByType: AssetSavedObjectsByType;
    userCreatedRules: UserCreatedRule[];
    isLoading: boolean;
    fetchError: Error | null;
    refetch: <TPageData>(options?: (import("@kbn/react-query").RefetchOptions & import("@kbn/react-query").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@kbn/react-query").QueryObserverResult<{
        assetSavedObjectsByType: AssetSavedObjectsByType;
        userCreatedRules: UserCreatedRule[];
    }, Error>>;
};
export {};
