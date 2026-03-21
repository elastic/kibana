import type { KibanaPrivilege } from './kibana_privilege';
export declare class PrivilegeCollection {
    private actions;
    constructor(privileges: KibanaPrivilege[]);
    grantsPrivilege(privilege: KibanaPrivilege): boolean;
    private checkActions;
}
