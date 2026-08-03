import React from 'react';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { Role, RoleMapping } from '../../../../../common';
import type { RolesAPIClient } from '../../../roles';
interface Props {
    rolesAPIClient: PublicMethodsOf<RolesAPIClient>;
    roleMapping: RoleMapping;
    canUseInlineScripts: boolean;
    canUseStoredScripts: boolean;
    mode: 'roles' | 'templates';
    onChange: (roleMapping: RoleMapping) => void;
    readOnly?: boolean;
}
interface State {
    roles: Role[];
}
export declare class RoleSelector extends React.Component<Props, State> {
    static defaultProps: Partial<Props>;
    constructor(props: Props);
    componentDidMount(): Promise<void>;
    render(): React.JSX.Element;
    private getRoleComboBox;
    private getRoleTemplates;
    private conditionallyRenderAddRoleTemplateButton;
    private getHelpText;
    private hasDeprecatedRolesAssigned;
}
export {};
