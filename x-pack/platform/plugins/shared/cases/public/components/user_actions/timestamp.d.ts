import React from 'react';
interface UserActionAvatarProps {
    createdAt: string;
    updatedAt?: string | null;
}
export declare const UserActionTimestamp: React.MemoExoticComponent<{
    ({ createdAt, updatedAt }: UserActionAvatarProps): React.JSX.Element;
    displayName: string;
}>;
export {};
