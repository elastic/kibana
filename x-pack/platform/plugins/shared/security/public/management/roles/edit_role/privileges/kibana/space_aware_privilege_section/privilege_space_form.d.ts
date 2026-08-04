import React, { Component } from 'react';
import type { KibanaPrivileges } from '@kbn/security-role-management-model';
import { PrivilegeFormCalculator } from '@kbn/security-ui-components';
import type { Role } from '../../../../../../../common';
import type { DisplaySpace } from '../display_space';
interface Props {
    role: Role;
    kibanaPrivileges: KibanaPrivileges;
    spaces: DisplaySpace[];
    privilegeIndex: number;
    canCustomizeSubFeaturePrivileges: boolean;
    onChange: (role: Role) => void;
    onCancel: () => void;
}
interface State {
    privilegeIndex: number;
    selectedSpaceIds: string[];
    selectedBasePrivilege: string[];
    role: Role;
    mode: 'create' | 'update';
    isCustomizingFeaturePrivileges: boolean;
    privilegeCalculator: PrivilegeFormCalculator;
}
export declare class PrivilegeSpaceForm extends Component<Props, State> {
    static defaultProps: {
        privilegeIndex: number;
    };
    constructor(props: Props);
    render(): React.JSX.Element;
    private getForm;
    private getSaveButton;
    private closeFlyout;
    private onSaveClick;
    private onSelectedSpacesChange;
    private onSpaceBasePrivilegeChange;
    private resetRoleFeature;
    private getDisplayedBasePrivilege;
    private onFeaturePrivilegesChange;
    private onChangeAllFeaturePrivileges;
    private setRole;
    private canSave;
    private isDefiningGlobalPrivilege;
}
export {};
