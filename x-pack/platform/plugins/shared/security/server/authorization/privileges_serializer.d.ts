import type { RawKibanaPrivileges } from '../../common';
interface SerializedPrivilege {
    application: string;
    name: string;
    actions: string[];
    metadata: Record<string, any>;
}
interface SerializedApplicationPrivileges {
    [key: string]: SerializedPrivilege;
}
interface SerializedPrivileges {
    [key: string]: SerializedApplicationPrivileges;
}
export declare const serializePrivileges: (application: string, privilegeMap: RawKibanaPrivileges) => SerializedPrivileges;
export {};
