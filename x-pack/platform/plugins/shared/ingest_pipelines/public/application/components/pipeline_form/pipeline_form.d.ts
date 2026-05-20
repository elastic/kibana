import React from 'react';
import type { Pipeline } from '../../../../common/types';
export interface PipelineFormProps {
    onSave: (pipeline: Pipeline) => void;
    onCancel: () => void;
    isSaving: boolean;
    saveError: any;
    defaultValue?: Pipeline;
    isEditing?: boolean;
    canEditName?: boolean;
}
export declare const PipelineForm: React.FunctionComponent<PipelineFormProps>;
