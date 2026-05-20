import React from 'react';
interface UserActionMoveToReferenceProps {
    id: string;
    outlineComment: (id: string) => void;
}
export declare const UserActionMoveToReference: React.MemoExoticComponent<{
    ({ id, outlineComment, }: UserActionMoveToReferenceProps): React.JSX.Element;
    displayName: string;
}>;
export {};
