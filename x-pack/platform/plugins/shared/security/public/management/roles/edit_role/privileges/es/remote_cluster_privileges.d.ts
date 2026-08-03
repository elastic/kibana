import React from 'react';
import type { Cluster } from '@kbn/remote-clusters-plugin/public';
import type { Role, SecurityLicense } from '../../../../../../common';
import type { RoleValidator } from '../../validate_role';
interface Props {
    remoteClusters?: Cluster[];
    role: Role;
    availableRemoteClusterPrivileges: string[];
    license: SecurityLicense;
    onChange: (role: Role) => void;
    validator: RoleValidator;
    editable?: boolean;
}
export declare const RemoteClusterPrivileges: React.FunctionComponent<Props>;
export {};
