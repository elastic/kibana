import React from 'react';
interface Props {
    selectedOwner: string;
    availableOwners: string[];
    isLoading: boolean;
    onOwnerChange: (owner: string) => void;
}
export declare const CreateCaseOwnerSelector: React.NamedExoticComponent<Props>;
export {};
