import React, { Component } from 'react';
import type { Capabilities } from '@kbn/core/public';
import type { KibanaPrivileges } from '@kbn/security-role-management-model';
import type { Space, SpacesApiUi } from '@kbn/spaces-plugin/public';
import type { Role } from '../../../../../../common';
import type { RoleValidator } from '../../validate_role';
interface Props {
    role: Role;
    spacesEnabled: boolean;
    canCustomizeSubFeaturePrivileges: boolean;
    spaces?: Space[];
    uiCapabilities: Capabilities;
    editable: boolean;
    kibanaPrivileges: KibanaPrivileges;
    onChange: (role: Role) => void;
    validator: RoleValidator;
    spacesApiUi?: SpacesApiUi;
}
export declare class KibanaPrivilegesRegion extends Component<Props, {}> {
    render(): React.JSX.Element;
    getForm: () => React.JSX.Element;
}
export {};
