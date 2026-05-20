import React from 'react';
import type { Cluster } from '@kbn/remote-clusters-plugin/public';
import type { RoleRemoteClusterPrivilege } from '../../../../../../common';
import type { RoleValidator } from '../../validate_role';
interface Props {
    formIndex: number;
    remoteClusterPrivilege: RoleRemoteClusterPrivilege;
    remoteClusters?: Cluster[];
    availableRemoteClusterPrivileges: string[];
    onChange: (remoteClusterPrivilege: RoleRemoteClusterPrivilege) => void;
    onDelete: () => void;
    isRoleReadOnly: boolean;
    validator: RoleValidator;
}
export declare const RemoteClusterPrivilegesForm: React.FunctionComponent<Props>;
export {};
