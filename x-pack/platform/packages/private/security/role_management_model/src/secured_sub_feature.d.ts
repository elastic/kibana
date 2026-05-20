import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import { SubFeature } from '@kbn/features-plugin/common';
import { SubFeaturePrivilege } from './sub_feature_privilege';
import { SubFeaturePrivilegeGroup } from './sub_feature_privilege_group';
export declare class SecuredSubFeature extends SubFeature {
    private readonly actionMapping;
    readonly privileges: SubFeaturePrivilege[];
    readonly privilegesTooltip: string;
    /**
     * A list of the privilege groups that have at least one enabled privilege.
     */
    private readonly nonEmptyPrivilegeGroups;
    constructor(config: SubFeatureConfig, actionMapping?: {
        [privilegeId: string]: string[];
    });
    getPrivilegeGroups(): SubFeaturePrivilegeGroup[];
    privilegeIterator({ predicate, }?: {
        predicate?: (privilege: SubFeaturePrivilege, feature: SecuredSubFeature) => boolean;
    }): IterableIterator<SubFeaturePrivilege>;
    getDescription(): string;
}
