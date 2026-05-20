import './privilege_space_table.scss';
import React, { Component } from 'react';
import type { Role } from '@kbn/security-plugin-types-common';
import { type PrivilegeFormCalculator } from '@kbn/security-ui-components';
import type { Space } from '@kbn/spaces-plugin/public';
interface Props {
    role: Role;
    privilegeCalculator: PrivilegeFormCalculator;
    onChange: (role: Role) => void;
    onEdit: (privilegeIndex: number) => void;
    displaySpaces: Space[];
    disabled?: boolean;
}
interface State {
    expandedSpacesGroups: number[];
}
export declare class PrivilegeSpaceTable extends Component<Props, State> {
    state: {
        expandedSpacesGroups: number[];
    };
    render(): React.JSX.Element;
    private renderKibanaPrivileges;
    private getSortedPrivileges;
    private toggleExpandSpacesGroup;
    private onDeleteSpacePrivilege;
}
export {};
