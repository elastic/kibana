import './feature_table.scss';
import React, { Component } from 'react';
import type { Role } from '@kbn/security-plugin-types-common';
import type { KibanaPrivileges } from '@kbn/security-role-management-model';
import type { PrivilegeFormCalculator } from '../privilege_form_calculator';
interface Props {
    role: Role;
    privilegeCalculator: PrivilegeFormCalculator;
    kibanaPrivileges: KibanaPrivileges;
    privilegeIndex: number;
    onChange: (featureId: string, privileges: string[]) => void;
    onChangeAll: (privileges: string[]) => void;
    showAdditionalPermissionsMessage: boolean;
    canCustomizeSubFeaturePrivileges: boolean;
    allSpacesSelected: boolean;
    disabled?: boolean;
}
interface State {
    expandedPrivilegeControls: Set<string>;
}
export declare class FeatureTable extends Component<Props, State> {
    static defaultProps: {
        privilegeIndex: number;
        showLocks: boolean;
    };
    private featureCategories;
    constructor(props: Props);
    render(): React.JSX.Element;
    private renderPrivilegeControlsForFeature;
    private onChange;
    private onChangeAllFeaturePrivileges;
    private getCategoryHelpText;
}
export {};
