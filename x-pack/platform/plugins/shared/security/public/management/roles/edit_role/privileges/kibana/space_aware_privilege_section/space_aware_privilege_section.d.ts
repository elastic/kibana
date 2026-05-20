import React, { Component } from 'react';
import type { Capabilities } from '@kbn/core/public';
import type { Role } from '@kbn/security-plugin-types-common';
import type { KibanaPrivileges } from '@kbn/security-role-management-model';
import type { Space, SpacesApiUi } from '@kbn/spaces-plugin/public';
import type { RoleValidator } from '../../../validate_role';
interface Props {
    kibanaPrivileges: KibanaPrivileges;
    role: Role;
    spaces: Space[];
    onChange: (role: Role) => void;
    editable: boolean;
    canCustomizeSubFeaturePrivileges: boolean;
    validator: RoleValidator;
    uiCapabilities: Capabilities;
    spacesApiUi: SpacesApiUi;
}
interface State {
    role: Role | null;
    privilegeIndex: number;
    showSpacePrivilegeEditor: boolean;
    showPrivilegeMatrix: boolean;
}
export declare class SpaceAwarePrivilegeSection extends Component<Props, State> {
    private globalSpaceEntry;
    constructor(props: Props);
    render(): React.JSX.Element;
    private renderKibanaPrivileges;
    private getAvailablePrivilegeButtons;
    private getDisplaySpaces;
    private getSelectedSpaces;
    private getAvailableSpaces;
    private addSpacePrivilege;
    private onSpacesPrivilegeChange;
    private onEditSpacesPrivileges;
    private onCancelEditPrivileges;
}
export {};
