import React from 'react';
export type EditMode = 'form' | 'yaml';
interface EditModeToggleProps {
    editMode: EditMode;
    onChange: (mode: EditMode) => void;
    disabled?: boolean;
}
export declare const EditModeToggle: ({ editMode, onChange, disabled }: EditModeToggleProps) => React.JSX.Element;
export {};
