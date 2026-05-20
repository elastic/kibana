import React from 'react';
import type { RoleKibanaPrivilege } from '@kbn/security-plugin-types-common';
import type { Space, SpacesApiUi } from '@kbn/spaces-plugin/public';
export interface SpaceColumnHeaderProps {
    spaces: Space[];
    entry: RoleKibanaPrivilege;
    spacesApiUi: SpacesApiUi;
}
export declare const SpaceColumnHeader: (props: SpaceColumnHeaderProps) => React.JSX.Element;
