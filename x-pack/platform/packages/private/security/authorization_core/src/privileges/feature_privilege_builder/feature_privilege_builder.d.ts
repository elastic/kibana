import type { FeatureKibanaPrivileges, KibanaFeature } from '@kbn/features-plugin/server';
import type { Actions } from '../../actions';
export interface FeaturePrivilegeBuilder {
    getActions(privilegeDefinition: FeatureKibanaPrivileges, feature: KibanaFeature): string[];
}
export declare abstract class BaseFeaturePrivilegeBuilder implements FeaturePrivilegeBuilder {
    protected readonly actions: Actions;
    constructor(actions: Actions);
    abstract getActions(privilegeDefinition: FeatureKibanaPrivileges, feature: KibanaFeature): string[];
}
