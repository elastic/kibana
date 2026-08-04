import React from 'react';
import type { RoleKibanaPrivilege } from '@kbn/security-plugin-types-common';
import type { SpacesApiUi } from '@kbn/spaces-plugin/public';
import type { DisplaySpace } from '../display_space';
export interface SpaceColumnHeaderProps {
    spaces: DisplaySpace[];
    entry: RoleKibanaPrivilege;
    spacesApiUi: SpacesApiUi;
}
export declare const SpaceColumnHeader: (props: SpaceColumnHeaderProps) => React.JSX.Element;
