import React from 'react';
export interface CopyModeControlProps {
    initialValues: CopyMode;
    updateSelection: (result: CopyMode) => void;
}
export interface CopyMode {
    createNewCopies: boolean;
    overwrite: boolean;
}
export declare const CopyModeControl: ({ initialValues, updateSelection }: CopyModeControlProps) => React.JSX.Element;
