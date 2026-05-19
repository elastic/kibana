import type { FeatureKibanaPrivileges, KibanaFeature } from '@kbn/features-plugin/server';
import { BaseFeaturePrivilegeBuilder } from './feature_privilege_builder';
export declare class FeaturePrivilegeAlertingBuilder extends BaseFeaturePrivilegeBuilder {
    getActions(privilegeDefinition: FeatureKibanaPrivileges, feature: KibanaFeature): string[];
}
