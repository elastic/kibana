import React from 'react';
import type { PackageInfo, RegistryPolicyTemplate } from '../../../../../types';
import type { DeprecationInfo } from '../../../../../../../../common/types';
export declare const isUpcomingDeprecation: (version: string, deprecated?: DeprecationInfo) => boolean;
/**
 * Resolves the effective deprecation info for a package/integration from all sources,
 * in priority order: conditions.deprecated → package.deprecated → integrationInfo.deprecated.
 */
export declare const getPackageDeprecationInfo: (packageInfo: PackageInfo, integrationInfo?: RegistryPolicyTemplate) => DeprecationInfo | undefined;
export declare const DeprecationCallout: React.FC<{
    packageInfo: PackageInfo;
    integrationInfo?: RegistryPolicyTemplate;
}>;
export declare const DeprecatedFeaturesList: React.FC<{
    packageInfo: PackageInfo;
}>;
export declare const DeprecatedFeaturesCallout: React.FC<{
    packageInfo: PackageInfo;
}>;
