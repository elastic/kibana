import type { SubFeaturePrivilegeGroupConfig } from '@kbn/features-plugin/common';
import { SubFeaturePrivilege } from './sub_feature_privilege';
export declare class SubFeaturePrivilegeGroup {
    private readonly config;
    private readonly actionMapping;
    constructor(config: SubFeaturePrivilegeGroupConfig, actionMapping?: {
        [privilegeId: string]: string[];
    });
    get groupType(): import("@kbn/features-plugin/common").SubFeaturePrivilegeGroupType;
    get privileges(): SubFeaturePrivilege[];
}
