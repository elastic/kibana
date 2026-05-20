import React, { Component } from 'react';
import type { Cluster } from '@kbn/remote-clusters-plugin/public';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { Role, RoleIndexPrivilege, SecurityLicense } from '../../../../../../common';
import type { IndicesAPIClient } from '../../../indices_api_client';
import type { RoleValidator } from '../../validate_role';
interface Props {
    indexType: 'indices' | 'remote_indices';
    indexPatterns?: string[];
    remoteClusters?: Cluster[];
    role: Role;
    availableIndexPrivileges: string[];
    indicesAPIClient: PublicMethodsOf<IndicesAPIClient>;
    license: SecurityLicense;
    onChange: (role: Role) => void;
    validator: RoleValidator;
    editable?: boolean;
    isDarkMode?: boolean;
}
interface State {
    availableFields: {
        [indexPrivKey: string]: string[];
    };
}
export declare class IndexPrivileges extends Component<Props, State> {
    static defaultProps: Partial<Props>;
    constructor(props: Props);
    render(): React.JSX.Element;
    addIndexPrivilege: () => void;
    onIndexPrivilegeChange: (privilegeIndex: number) => (updatedPrivilege: RoleIndexPrivilege) => void;
    onIndexPrivilegeDelete: (privilegeIndex: number) => () => void;
    isPlaceholderPrivilege: (indexPrivilege: RoleIndexPrivilege) => boolean;
}
export {};
