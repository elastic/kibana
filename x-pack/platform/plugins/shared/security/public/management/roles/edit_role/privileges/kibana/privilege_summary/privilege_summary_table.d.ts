import React from 'react';
import type { Role } from '@kbn/security-plugin-types-common';
import { type KibanaPrivileges } from '@kbn/security-role-management-model';
import type { Space, SpacesApiUi } from '@kbn/spaces-plugin/public';
export interface PrivilegeSummaryTableProps {
    role: Role;
    spaces: Space[];
    kibanaPrivileges: KibanaPrivileges;
    canCustomizeSubFeaturePrivileges: boolean;
    spacesApiUi: SpacesApiUi;
}
export declare const PrivilegeSummaryTable: (props: PrivilegeSummaryTableProps) => React.JSX.Element;
