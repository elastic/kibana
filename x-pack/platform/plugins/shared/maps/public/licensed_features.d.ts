import type { LicenseType } from '@kbn/licensing-types';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
export declare enum LICENSED_FEATURES {
    GEO_LINE_AGG = "GEO_LINE_AGG",
    GEO_SHAPE_AGGS_GEO_TILE = "GEO_SHAPE_AGGS_GEO_TILE",
    ON_PREM_EMS = "ON_PREM_EMS"
}
export interface LicensedFeatureDetail {
    name: string;
    license: LicenseType;
}
export declare const LICENCED_FEATURES_DETAILS: Record<LICENSED_FEATURES, LicensedFeatureDetail>;
export declare const getLicenseId: () => string | undefined;
export declare const getIsGoldPlus: () => boolean;
export declare const whenLicenseInitialized: () => Promise<void>;
export declare function setLicensingPluginStart(licensingPlugin: LicensingPluginStart): Promise<void>;
export declare function registerLicensedFeatures(licensingPlugin: LicensingPluginSetup): void;
export declare function notifyLicensedFeatureUsage(licensedFeature: LICENSED_FEATURES): void;
