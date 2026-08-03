import type { ReactElement } from 'react';
import React from 'react';
import type { NotificationsStart } from '@kbn/core/public';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { RoleMapping } from '../../../../../common';
import type { RoleMappingsAPIClient } from '../../role_mappings_api_client';
interface Props {
    roleMappingsAPI: PublicMethodsOf<RoleMappingsAPIClient>;
    notifications: NotificationsStart;
    children: (deleteMappings: DeleteRoleMappings) => ReactElement;
}
export type DeleteRoleMappings = (roleMappings: RoleMapping[], onSuccess?: OnSuccessCallback, onCancel?: OnCancelCallback) => void;
type OnSuccessCallback = (deletedRoleMappings: string[]) => void;
type OnCancelCallback = () => void;
export declare const DeleteProvider: React.FunctionComponent<Props>;
export {};
