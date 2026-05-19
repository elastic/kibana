import React, { Component } from 'react';
import type { NotificationsStart } from '@kbn/core/public';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { UserAPIClient } from '../../user_api_client';
interface Props {
    usersToDelete: string[];
    userAPIClient: PublicMethodsOf<UserAPIClient>;
    notifications: NotificationsStart;
    onCancel: () => void;
    callback?: (usersToDelete: string[], errors: string[]) => void;
}
export declare class ConfirmDeleteUsers extends Component<Props, unknown> {
    render(): React.JSX.Element;
    private deleteUsers;
}
export {};
