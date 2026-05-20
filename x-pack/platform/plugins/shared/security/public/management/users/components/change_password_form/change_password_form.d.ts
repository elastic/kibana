import React, { Component } from 'react';
import type { NotificationsStart } from '@kbn/core/public';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { User } from '../../../../../common';
import type { UserAPIClient } from '../../user_api_client';
interface Props {
    user: User;
    isUserChangingOwnPassword: boolean;
    onChangePassword?: () => void;
    userAPIClient: PublicMethodsOf<UserAPIClient>;
    notifications: NotificationsStart;
}
interface State {
    shouldValidate: boolean;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    currentPasswordError: boolean;
    changeInProgress: boolean;
}
export declare class ChangePasswordForm extends Component<Props, State> {
    constructor(props: Props);
    render(): React.JSX.Element;
    private getForm;
    private onCurrentPasswordChange;
    private onNewPasswordChange;
    private onConfirmPasswordChange;
    private onCancelClick;
    private onChangePasswordClick;
    private validateCurrentPassword;
    private validateNewPassword;
    private validateConfirmPassword;
    private validateForm;
    private performPasswordChange;
    private handleChangePasswordSuccess;
    private handleChangePasswordFailure;
}
export {};
