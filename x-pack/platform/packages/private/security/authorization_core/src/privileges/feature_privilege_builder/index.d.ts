import type { FeaturePrivilegeBuilder } from './feature_privilege_builder';
import type { Actions } from '../../actions';
export type { CasesSupportedOperations } from './cases';
export type { FeaturePrivilegeBuilder };
export declare const featurePrivilegeBuilderFactory: (actions: Actions) => FeaturePrivilegeBuilder;
