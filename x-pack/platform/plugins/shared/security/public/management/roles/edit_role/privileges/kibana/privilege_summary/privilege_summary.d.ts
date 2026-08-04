import React from 'react';
import type { Role } from '@kbn/security-plugin-types-common';
import type { KibanaPrivileges } from '@kbn/security-role-management-model';
import type { SpacesApiUi } from '@kbn/spaces-plugin/public';
import type { DisplaySpace } from '../display_space';
interface Props {
    role: Role;
    spaces: DisplaySpace[];
    kibanaPrivileges: KibanaPrivileges;
    canCustomizeSubFeaturePrivileges: boolean;
    spacesApiUi: SpacesApiUi;
}
export declare const PrivilegeSummary: (props: Props) => React.JSX.Element;
export {};
