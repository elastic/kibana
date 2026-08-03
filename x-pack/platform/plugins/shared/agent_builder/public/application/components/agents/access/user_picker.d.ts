import React from 'react';
interface UserPickerProps {
    /** Usernames already added to the ACL (excluded from the dropdown). */
    excludedUsernames: string[];
    onAdd: (username: string) => void;
    isDisabled?: boolean;
}
export declare const UserPicker: React.FC<UserPickerProps>;
export {};
