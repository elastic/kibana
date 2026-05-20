import type { LicenseType } from '@kbn/licensing-types';
import type { FeatureKibanaPrivileges, KibanaFeature } from '..';
/**
 * Options to control feature privilege iteration.
 */
export interface FeaturePrivilegeIteratorOptions {
    /**
     * Augment each privilege definition with its sub-feature privileges.
     */
    augmentWithSubFeaturePrivileges: boolean;
    /**
     * Function that returns whether the current license is equal to or greater than the given license type.
     * Controls which sub-features are returned, as they may have different license terms than the overall feature.
     */
    licenseHasAtLeast: (licenseType: LicenseType) => boolean | undefined;
    /**
     * Optional predicate to filter the returned set of privileges.
     */
    predicate?: (privilegeId: string, privilege: FeatureKibanaPrivileges) => boolean;
}
/**
 * Utility for iterating through all privileges belonging to a specific feature.
 * Iteration can be customized in several ways:
 * - Filter privileges with a given predicate.
 * - Augment privileges with their respective sub-feature privileges.
 *
 * @param feature the feature whose privileges to iterate through.
 * @param options options to control iteration.
 */
export type FeaturePrivilegeIterator = (feature: KibanaFeature, options: FeaturePrivilegeIteratorOptions) => IterableIterator<{
    privilegeId: string;
    privilege: FeatureKibanaPrivileges;
}>;
declare const featurePrivilegeIterator: FeaturePrivilegeIterator;
export { featurePrivilegeIterator };
