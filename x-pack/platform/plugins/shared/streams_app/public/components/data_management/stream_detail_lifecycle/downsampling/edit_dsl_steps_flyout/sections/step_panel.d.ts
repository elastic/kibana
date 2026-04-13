import React from 'react';
import type { ArrayItem } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { TimeUnit } from '../form';
export interface StepPanelProps {
    item: ArrayItem;
    stepIndex: number;
    selectedStepIndex: number | undefined;
    onRemoveStep: (stepIndex: number) => void;
    dataTestSubj: string;
    timeUnitOptions: ReadonlyArray<{
        value: TimeUnit;
        text: string;
    }>;
    dataRetentionMs?: number;
    dataRetentionEsFormat?: string;
}
export declare const StepPanel: ({ item, stepIndex, selectedStepIndex, onRemoveStep, dataTestSubj, timeUnitOptions, dataRetentionMs, dataRetentionEsFormat, }: StepPanelProps) => React.JSX.Element;
