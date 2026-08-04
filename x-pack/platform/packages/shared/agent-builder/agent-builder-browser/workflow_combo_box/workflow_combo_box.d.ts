import type { EuiComboBoxProps } from '@elastic/eui';
import React from 'react';
export interface WorkflowComboBoxOption {
    id: string;
    name: string;
}
export interface WorkflowComboBoxProps extends Omit<EuiComboBoxProps<string>, 'options' | 'selectedOptions' | 'onChange' | 'singleSelection'> {
    workflows: WorkflowComboBoxOption[];
    value: string[];
    onChange: (workflowIds: string[]) => void;
    singleSelection?: boolean;
}
export declare const WorkflowComboBox: React.FC<WorkflowComboBoxProps>;
