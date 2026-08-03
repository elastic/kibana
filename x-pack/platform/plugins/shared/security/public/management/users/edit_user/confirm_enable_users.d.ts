import type { FunctionComponent } from 'react';
export interface ConfirmEnableUsersProps {
    usernames: string[];
    onCancel(): void;
    onSuccess?(): void;
}
export declare const ConfirmEnableUsers: FunctionComponent<ConfirmEnableUsersProps>;
