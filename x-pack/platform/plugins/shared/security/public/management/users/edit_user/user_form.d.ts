import type { FunctionComponent } from 'react';
export declare const THROTTLE_USERS_WAIT = 10000;
export interface UserFormValues {
    username?: string;
    full_name?: string;
    email?: string;
    current_password?: string;
    password?: string;
    confirm_password?: string;
    roles: readonly string[];
}
export interface UserFormProps {
    isNewUser?: boolean;
    isReservedUser?: boolean;
    isCurrentUser?: boolean;
    defaultValues?: UserFormValues;
    onCancel(): void;
    onSuccess?(): void;
    disabled?: boolean;
}
export declare const UserForm: FunctionComponent<UserFormProps>;
