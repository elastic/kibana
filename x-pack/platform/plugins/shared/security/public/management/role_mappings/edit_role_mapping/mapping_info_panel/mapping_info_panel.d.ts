import React, { Component } from 'react';
import type { DocLinksStart } from '@kbn/core/public';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { RoleMapping } from '../../../../../common';
import type { RolesAPIClient } from '../../../roles';
interface Props {
    roleMapping: RoleMapping;
    onChange: (roleMapping: RoleMapping) => void;
    mode: 'create' | 'edit' | 'view';
    validateForm: boolean;
    canUseInlineScripts: boolean;
    canUseStoredScripts: boolean;
    rolesAPIClient: PublicMethodsOf<RolesAPIClient>;
    docLinks: DocLinksStart;
}
interface State {
    rolesMode: 'roles' | 'templates';
}
export declare class MappingInfoPanel extends Component<Props, State> {
    constructor(props: Props);
    render(): React.JSX.Element;
    private getRoleMappingName;
    private getRolesOrRoleTemplatesSelector;
    private getRolesSelector;
    private getSwitchToRoleTemplateButton;
    private getRoleTemplatesSelector;
    private getSwitchToRolesButton;
    private getEnabledSwitch;
    private onNameChange;
    private onRolesModeChange;
}
export {};
