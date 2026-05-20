import type { FC } from 'react';
import type { BuildFlavor } from '@kbn/config';
import type { NotificationsStart, ScopedHistory } from '@kbn/core/public';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { StartServices } from '../../..';
import type { RolesAPIClient } from '../roles_api_client';
export interface Props extends StartServices {
    notifications: NotificationsStart;
    rolesAPIClient: PublicMethodsOf<RolesAPIClient>;
    history: ScopedHistory;
    readOnly?: boolean;
    buildFlavor: BuildFlavor;
    cloudOrgUrl?: string;
}
export declare const RolesGridPage: FC<Props>;
