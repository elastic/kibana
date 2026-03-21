import type { FeatureKibanaPrivileges } from '@kbn/features-plugin/server';
import { BaseFeaturePrivilegeBuilder } from './feature_privilege_builder';
export declare class FeaturePrivilegeManagementBuilder extends BaseFeaturePrivilegeBuilder {
    getActions(privilegeDefinition: FeatureKibanaPrivileges): string[];
}
