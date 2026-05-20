import React from 'react';
interface Props {
    disabled: boolean;
    hidden: boolean;
    showAddOnFailure: boolean;
    onDuplicate: () => void;
    onDelete: () => void;
    onAddOnFailure: () => void;
    'data-test-subj'?: string;
}
export declare const ContextMenu: React.ForwardRefExoticComponent<Props & React.RefAttributes<HTMLButtonElement>>;
export {};
