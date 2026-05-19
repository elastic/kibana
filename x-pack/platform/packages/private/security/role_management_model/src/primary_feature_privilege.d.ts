import type { FeatureKibanaPrivileges } from '@kbn/features-plugin/public';
import { KibanaPrivilege } from './kibana_privilege';
export declare class PrimaryFeaturePrivilege extends KibanaPrivilege {
    protected readonly config: FeatureKibanaPrivileges;
    readonly actions: string[];
    constructor(id: string, config: FeatureKibanaPrivileges, actions?: string[]);
    getMinimalPrivilegeId(): string;
    get requireAllSpaces(): boolean;
    get disabled(): boolean;
}
