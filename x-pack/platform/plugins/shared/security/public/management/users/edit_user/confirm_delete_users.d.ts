import type { FunctionComponent } from 'react';
export interface ConfirmDeleteUsersProps {
    usernames: string[];
    onCancel(): void;
    onSuccess?(): void;
}
export declare const ConfirmDeleteUsers: FunctionComponent<ConfirmDeleteUsersProps>;
