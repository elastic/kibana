import React, { Component } from 'react';
import type { BuildFlavor } from '@kbn/config';
import type { NotificationsStart } from '@kbn/core/public';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { StartServices } from '../../../..';
import type { RolesAPIClient } from '../../roles_api_client';
interface Props extends StartServices {
    rolesToDelete: string[];
    callback: (rolesToDelete: string[], errors: string[]) => void;
    onCancel: () => void;
    notifications: NotificationsStart;
    rolesAPIClient: PublicMethodsOf<RolesAPIClient>;
    buildFlavor: BuildFlavor;
    cloudOrgUrl?: string;
}
interface State {
    deleteInProgress: boolean;
}
export declare class ConfirmDelete extends Component<Props, State> {
    constructor(props: Props);
    render(): React.JSX.Element;
    private onConfirmDelete;
    private deleteRoles;
}
export {};
