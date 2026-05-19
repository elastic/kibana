import React from 'react';
export interface WorkflowPickerProps {
    name: string;
    /** Single workflow (string) vs multiple (string[]). Default true. */
    singleSelection?: boolean;
    isDisabled?: boolean;
}
export declare const WorkflowPicker: React.FC<WorkflowPickerProps>;
