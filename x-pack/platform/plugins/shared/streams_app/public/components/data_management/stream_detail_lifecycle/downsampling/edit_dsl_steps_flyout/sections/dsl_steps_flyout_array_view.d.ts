import React from 'react';
import type { FormArrayField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
export interface DslStepsFlyoutArrayViewProps {
    arrayField: FormArrayField;
    flyoutTitleId: string;
    dataTestSubj: string;
    selectedStepIndex: number | undefined;
    setSelectedStepIndex: (index: number | undefined) => void;
    tabHasErrors: (stepPath: string) => boolean;
    pruneToStepPaths: (stepPaths: string[]) => void;
    reindexErrorsAfterRemoval: (removedIndex: number) => void;
    dataRetentionMs?: number;
    dataRetentionEsFormat?: string;
}
export declare const DslStepsFlyoutArrayView: ({ arrayField, flyoutTitleId, dataTestSubj, selectedStepIndex, setSelectedStepIndex, tabHasErrors, pruneToStepPaths, reindexErrorsAfterRemoval, dataRetentionMs, dataRetentionEsFormat, }: DslStepsFlyoutArrayViewProps) => React.JSX.Element;
