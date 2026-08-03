import React, { Component } from 'react';
import type { Role } from '../../../../../../common';
interface Props {
    role: Role;
    builtinClusterPrivileges: string[];
    onChange: (privs: string[]) => void;
    editable?: boolean;
}
export declare class ClusterPrivileges extends Component<Props, {}> {
    static defaultProps: Partial<Props>;
    render(): React.JSX.Element;
    buildComboBox: (items: string[]) => React.JSX.Element;
    onClusterPrivilegesChange: (selectedPrivileges: any) => void;
    private onCreateCustomPrivilege;
    private getAvailableClusterPrivileges;
}
export {};
