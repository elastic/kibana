import React from 'react';
import type { ArrayItem } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
export interface StepTabsRowProps {
    items: ArrayItem[];
    selectedStepIndex: number | undefined;
    setSelectedStepIndex: (index: number) => void;
    onAddStep: () => void;
    isAddDisabled: boolean;
    tabHasErrors: (stepPath: string) => boolean;
    dataTestSubj: string;
}
export declare const StepTabsRow: ({ items, selectedStepIndex, setSelectedStepIndex, onAddStep, isAddDisabled, tabHasErrors, dataTestSubj, }: StepTabsRowProps) => React.JSX.Element;
