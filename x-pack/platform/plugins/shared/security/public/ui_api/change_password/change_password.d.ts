import React, { Component } from 'react';
import type { NotificationsStart } from '@kbn/core/public';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { AuthenticatedUser } from '../../../common';
import type { UserAPIClient } from '../../management/users';
export interface ChangePasswordProps {
    user: AuthenticatedUser;
}
export interface ChangePasswordPropsInternal extends ChangePasswordProps {
    userAPIClient: PublicMethodsOf<UserAPIClient>;
    notifications: NotificationsStart;
}
export declare class ChangePassword extends Component<ChangePasswordPropsInternal, {}> {
    render(): React.JSX.Element;
    private getChangePasswordForm;
    private getChangePasswordUnavailable;
}
