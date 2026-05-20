import type { LicenseType } from '@kbn/licensing-types';
import type { KibanaFeature, SubFeaturePrivilegeConfig } from '../../common';
/**
 * Utility for iterating through all sub-feature privileges belonging to a specific feature.
 *
 * @param feature the feature whose sub-feature privileges to iterate through.
 * @param licenseType the current license.
 */
export type SubFeaturePrivilegeIterator = (feature: KibanaFeature, licenseHasAtLeast: (licenseType: LicenseType) => boolean | undefined) => IterableIterator<SubFeaturePrivilegeConfig>;
declare const subFeaturePrivilegeIterator: SubFeaturePrivilegeIterator;
export { subFeaturePrivilegeIterator };
