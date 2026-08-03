import React, { Component } from 'react';
import type { Cluster } from '@kbn/remote-clusters-plugin/public';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { RoleIndexPrivilege, RoleRemoteIndexPrivilege } from '../../../../../../common';
import type { IndicesAPIClient } from '../../../indices_api_client';
import type { RoleValidator } from '../../validate_role';
interface Props {
    formIndex: number;
    indexType: 'indices' | 'remote_indices';
    indexPrivilege: RoleIndexPrivilege | RoleRemoteIndexPrivilege;
    remoteClusters?: Cluster[];
    indexPatterns: string[];
    availableIndexPrivileges: string[];
    indicesAPIClient: PublicMethodsOf<IndicesAPIClient>;
    onChange: (indexPrivilege: RoleIndexPrivilege | RoleRemoteIndexPrivilege) => void;
    onDelete: () => void;
    isRoleReadOnly: boolean;
    allowDocumentLevelSecurity: boolean;
    allowFieldLevelSecurity: boolean;
    validator: RoleValidator;
    isDarkMode?: boolean;
}
interface State {
    queryExpanded: boolean;
    fieldSecurityExpanded: boolean;
    grantedFields: string[];
    exceptedFields: string[];
    documentQuery?: string;
    documentQueryEditorHeight: string;
    isFieldListLoading: boolean;
    flsOptions: string[];
}
export declare class IndexPrivilegeForm extends Component<Props, State> {
    private isFieldListLoading;
    constructor(props: Props);
    componentDidMount(): void;
    render(): React.JSX.Element;
    private getPrivilegeForm;
    private loadFLSOptions;
    private getFieldLevelControls;
    private getGrantedDocumentsControl;
    private editorDidMount;
    private toggleDocumentQuery;
    private toggleFieldSecurity;
    private onCreateClusterOption;
    private onClustersChange;
    private onCreateIndexPatternOption;
    private onIndexPatternsChange;
    private onPrivilegeChange;
    private onCreateCustomPrivilege;
    private onQueryChange;
    private onCreateGrantedField;
    private onGrantedFieldsChange;
    private onCreateDeniedField;
    private onDeniedFieldsChange;
    private getFieldSecurity;
    private isFieldSecurityConfigured;
}
export {};
