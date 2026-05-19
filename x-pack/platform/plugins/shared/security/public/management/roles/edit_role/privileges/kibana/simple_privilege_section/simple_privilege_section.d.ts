import React, { Component } from 'react';
import type { Role } from '@kbn/security-plugin-types-common';
import { type KibanaPrivileges } from '@kbn/security-role-management-model';
interface Props {
    role: Role;
    kibanaPrivileges: KibanaPrivileges;
    onChange: (role: Role) => void;
    editable: boolean;
    canCustomizeSubFeaturePrivileges: boolean;
}
interface State {
    isCustomizingGlobalPrivilege: boolean;
    globalPrivsIndex: number;
}
export declare class SimplePrivilegeSection extends Component<Props, State> {
    constructor(props: Props);
    render(): React.JSX.Element;
    getDisplayedBasePrivilege: () => string;
    onKibanaPrivilegeChange: (privilege: string) => void;
    onFeaturePrivilegeChange: (featureId: string, privileges: string[]) => void;
    private onChangeAllFeaturePrivileges;
    private maybeRenderSpacePrivilegeWarning;
    private locateGlobalPrivilegeIndex;
    private locateGlobalPrivilege;
    private createGlobalPrivilegeEntry;
}
export {};
