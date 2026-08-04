import React from 'react';
import type { Role } from '@kbn/security-plugin-types-common';
import type { Space } from '../../../../../common';
interface ISpaceAssignedRolesTableProps {
    isReadOnly?: boolean;
    currentSpace: Space;
    assignedRoles: Map<Role['name'], Role>;
    onClickAssignNewRole: () => Promise<void>;
    onClickRowEditAction: (role: Role) => void;
    onClickRemoveRoleConfirm: (role: Role) => void;
    supportsBulkAction?: boolean;
    onClickBulkRemove?: (selectedRoles: Role[]) => void;
}
/**
 * @description checks if the passed role qualifies as one that can
 * be edited by a user with sufficient permissions
 */
export declare const isEditableRole: (role: Role) => boolean;
export declare const SpaceAssignedRolesTable: ({ assignedRoles, currentSpace, onClickAssignNewRole, onClickBulkRemove, onClickRowEditAction, onClickRemoveRoleConfirm, isReadOnly, supportsBulkAction, }: ISpaceAssignedRolesTableProps) => React.JSX.Element;
export {};
