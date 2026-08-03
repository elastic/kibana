import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { KibanaFeature } from '@kbn/features-plugin/common';
import { PrimaryFeaturePrivilege } from './primary_feature_privilege';
import { SecuredSubFeature } from './secured_sub_feature';
import type { SubFeaturePrivilege } from './sub_feature_privilege';
export declare class SecuredFeature extends KibanaFeature {
    private readonly primaryFeaturePrivileges;
    private readonly minimalPrimaryFeaturePrivileges;
    private readonly subFeaturePrivileges;
    private readonly securedSubFeatures;
    constructor(config: KibanaFeatureConfig, actionMapping?: {
        [privilegeId: string]: string[];
    });
    getPrivilegesTooltip(): string | undefined;
    getAllPrivileges(): (PrimaryFeaturePrivilege | SubFeaturePrivilege)[];
    getPrimaryFeaturePrivileges({ includeMinimalFeaturePrivileges }?: {
        includeMinimalFeaturePrivileges: boolean;
    }): PrimaryFeaturePrivilege[];
    getMinimalFeaturePrivileges(): PrimaryFeaturePrivilege[];
    getSubFeaturePrivileges(): SubFeaturePrivilege[];
    getSubFeatures(): SecuredSubFeature[];
}
