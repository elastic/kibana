import type { FunctionComponent } from 'react';
export interface ChangePasswordFormValues {
    current_password?: string;
    password: string;
    confirm_password: string;
}
export interface ChangePasswordModalProps {
    username: string;
    defaultValues?: ChangePasswordFormValues;
    onCancel(): void;
    onSuccess?(): void;
}
export declare const validateChangePasswordForm: (values: ChangePasswordFormValues, isCurrentUser: boolean) => {
    current_password?: string | undefined;
    password?: string | undefined;
    confirm_password?: string | undefined;
};
export declare const ChangePasswordModal: FunctionComponent<ChangePasswordModalProps>;
