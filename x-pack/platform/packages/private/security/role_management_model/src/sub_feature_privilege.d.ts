import type { SubFeaturePrivilegeConfig } from '@kbn/features-plugin/public';
import { KibanaPrivilege } from './kibana_privilege';
export declare class SubFeaturePrivilege extends KibanaPrivilege {
    protected readonly subPrivilegeConfig: SubFeaturePrivilegeConfig;
    readonly actions: string[];
    constructor(subPrivilegeConfig: SubFeaturePrivilegeConfig, actions?: string[]);
    get name(): string;
    get disabled(): boolean | undefined;
    get requireAllSpaces(): boolean;
}
