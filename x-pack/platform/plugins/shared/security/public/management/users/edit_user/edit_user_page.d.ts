import type { FunctionComponent } from 'react';
export interface EditUserPageProps {
    username: string;
}
export type EditUserPageAction = 'changePassword' | 'disableUser' | 'enableUser' | 'deleteUser' | 'none';
export declare const EditUserPage: FunctionComponent<EditUserPageProps>;
