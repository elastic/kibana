import React, { Component } from 'react';
import type { DocLinksStart, NotificationsStart, ScopedHistory } from '@kbn/core/public';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { RoleMapping } from '../../../../common';
import type { RolesAPIClient } from '../../roles';
import type { SecurityFeaturesAPIClient } from '../../security_features';
import type { RoleMappingsAPIClient } from '../role_mappings_api_client';
interface State {
    loadState: 'loading' | 'permissionDenied' | 'ready' | 'saveInProgress';
    roleMapping: RoleMapping | null;
    hasCompatibleRealms: boolean;
    canUseStoredScripts: boolean;
    canUseInlineScripts: boolean;
    formError: {
        isInvalid: boolean;
        error?: string;
    };
    validateForm: boolean;
    rulesValid: boolean;
}
interface Props {
    action: 'edit' | 'clone';
    name?: string;
    roleMappingsAPI: PublicMethodsOf<RoleMappingsAPIClient>;
    rolesAPIClient: PublicMethodsOf<RolesAPIClient>;
    securityFeaturesAPI: PublicMethodsOf<SecurityFeaturesAPIClient>;
    notifications: NotificationsStart;
    docLinks: DocLinksStart;
    history: ScopedHistory;
    readOnly?: boolean;
}
export declare class EditRoleMappingPage extends Component<Props, State> {
    static defaultProps: Partial<Props>;
    constructor(props: any);
    componentDidMount(): void;
    componentDidUpdate(prevProps: Props): Promise<void>;
    render(): React.JSX.Element;
    private getInfoPanelMode;
    private getFormTitle;
    private isObject;
    private isRoleMappingAnyRule;
    private isRoleMappingAllRule;
    private checkEmptyAnyAllMappings;
    private getFormWarnings;
    private getFormButtons;
    private getReturnToRoleMappingListButton;
    private getSaveButton;
    private getCancelButton;
    private getDeleteButton;
    private onRuleValidityChange;
    private saveRoleMapping;
    private editingExistingRoleMapping;
    private cloningExistingRoleMapping;
    private isReadOnlyRoleMapping;
    private isReadOnly;
    private loadAppData;
    private backToRoleMappingsList;
}
export {};
