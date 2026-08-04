import type { FC } from 'react';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import type { Role } from '@kbn/security-plugin-types-common';
import type { BulkUpdateRoleResponse } from '@kbn/security-plugin-types-public/src/roles/roles_api_client';
import type { Space } from '../../../../../common';
interface PrivilegesRolesFormProps {
    space: Space;
    features: KibanaFeature[];
    closeFlyout: () => void;
    onSaveCompleted: (response: BulkUpdateRoleResponse) => void;
    /**
     * @description default roles that should be selected when the form is opened,
     * this is useful when the form is opened in edit mode
     */
    defaultSelected?: Role[];
}
export declare const PrivilegesRolesForm: FC<PrivilegesRolesFormProps>;
export {};
