import React, { Component } from 'react';
import type { BuildFlavor } from '@kbn/config';
import type { DocLinksStart } from '@kbn/core/public';
import type { Cluster } from '@kbn/remote-clusters-plugin/public';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { BuiltinESPrivileges, Role, SecurityLicense } from '../../../../../../common';
import type { IndicesAPIClient } from '../../../indices_api_client';
import type { RoleValidator } from '../../validate_role';
interface Props {
    role: Role;
    editable: boolean;
    indicesAPIClient: PublicMethodsOf<IndicesAPIClient>;
    docLinks: DocLinksStart;
    license: SecurityLicense;
    onChange: (role: Role) => void;
    runAsUsers: string[];
    validator: RoleValidator;
    builtinESPrivileges: BuiltinESPrivileges;
    indexPatterns: string[];
    remoteClusters?: Cluster[];
    canUseRemoteIndices?: boolean;
    canUseRemoteClusters?: boolean;
    isDarkMode?: boolean;
    buildFlavor: BuildFlavor;
}
export declare class ElasticsearchPrivileges extends Component<Props, {}> {
    render(): React.JSX.Element;
    getForm: () => React.JSX.Element;
    learnMore: (href: string) => React.JSX.Element;
    addIndexPrivilege: () => void;
    onClusterPrivilegesChange: (cluster: string[]) => void;
    onRunAsUserChange: (users: any) => void;
    onCreateRunAsOption: (option: any) => void;
}
export {};
