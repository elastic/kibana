import type { FunctionComponent } from 'react';
export interface ConfirmDisableUsersProps {
    usernames: string[];
    onCancel(): void;
    onSuccess?(): void;
}
export declare const ConfirmDisableUsers: FunctionComponent<ConfirmDisableUsersProps>;
