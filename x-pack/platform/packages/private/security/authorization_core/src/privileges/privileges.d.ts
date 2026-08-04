import type { FeatureKibanaPrivileges, FeatureKibanaPrivilegesReference } from '@kbn/features-plugin/common';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { RawKibanaPrivileges, SecurityLicense } from '@kbn/security-plugin-types-common';
import type { Actions } from '../actions';
export interface PrivilegesService {
    get(respectLicenseLevel?: boolean): RawKibanaPrivileges;
}
export declare function privilegesFactory(actions: Actions, featuresService: FeaturesPluginSetup, licenseService: Pick<SecurityLicense, 'getFeatures' | 'hasAtLeast'>): {
    get(respectLicenseLevel?: boolean): {
        features: Record<string, Record<string, string[]>>;
        global: {
            all: string[];
            read: string[];
        };
        space: {
            all: string[];
            read: string[];
        };
        reserved: Record<string, string[]>;
    };
};
/**
 * Returns a list of privileges that replace the given privilege, if any. Works for both top-level
 * and sub-feature privileges.
 * @param privilegeId The ID of the privilege to get replacements for.
 * @param privilege The privilege definition to get replacements for.
 */
export declare function getReplacedByForPrivilege(privilegeId: string, privilege: FeatureKibanaPrivileges): readonly FeatureKibanaPrivilegesReference[] | undefined;
