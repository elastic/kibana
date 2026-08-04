import React, { Component } from 'react';
import type { ApplicationStart, DocLinksStart, NotificationsStart, ScopedHistory } from '@kbn/core/public';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { Role, RoleMapping } from '../../../../common';
import type { RolesAPIClient } from '../../roles';
import type { SecurityFeaturesAPIClient } from '../../security_features';
import type { RoleMappingsAPIClient } from '../role_mappings_api_client';
interface Props {
    rolesAPIClient: PublicMethodsOf<RolesAPIClient>;
    roleMappingsAPI: PublicMethodsOf<RoleMappingsAPIClient>;
    securityFeaturesAPI: PublicMethodsOf<SecurityFeaturesAPIClient>;
    notifications: NotificationsStart;
    docLinks: DocLinksStart;
    history: ScopedHistory;
    navigateToApp: ApplicationStart['navigateToApp'];
    readOnly?: boolean;
}
interface State {
    loadState: 'loadingApp' | 'loadingTable' | 'permissionDenied' | 'finished';
    roleMappings: null | RoleMapping[];
    roles: null | Role[];
    selectedItems: RoleMapping[];
    hasCompatibleRealms: boolean;
    error: any;
}
export declare class RoleMappingsGridPage extends Component<Props, State> {
    static defaultProps: Partial<Props>;
    constructor(props: any);
    componentDidMount(): void;
    render(): React.JSX.Element;
    private isReadOnlyRoleMapping;
    private renderTable;
    private getColumnConfig;
    private onRoleMappingsDeleted;
    private checkPrivileges;
    private performInitialLoad;
    private reloadRoleMappings;
    private loadRoleMappings;
}
export {};
