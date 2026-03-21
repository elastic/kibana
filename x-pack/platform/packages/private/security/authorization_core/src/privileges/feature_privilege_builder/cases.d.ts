import type { FeatureKibanaPrivileges, KibanaFeature } from '@kbn/features-plugin/server';
import { BaseFeaturePrivilegeBuilder } from './feature_privilege_builder';
export type CasesSupportedOperations = (typeof allOperations)[number];
declare const allOperations: readonly ["pushCase", "createCase", "getCase", "getComment", "getTags", "getReporters", "getUserActions", "findConfigurations", "updateCase", "updateComment", "deleteCase", "deleteComment", "createConfiguration", "updateConfiguration", "createComment", "reopenCase", "assignCase"];
export declare class FeaturePrivilegeCasesBuilder extends BaseFeaturePrivilegeBuilder {
    getActions(privilegeDefinition: FeatureKibanaPrivileges, feature: KibanaFeature): string[];
}
export {};
