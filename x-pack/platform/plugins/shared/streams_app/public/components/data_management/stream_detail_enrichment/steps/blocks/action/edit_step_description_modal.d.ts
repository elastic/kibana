import React from 'react';
import type { StreamlangProcessorDefinitionWithUIAttributes } from '@kbn/streamlang';
export interface EditStepDescriptionModalProps {
    step: StreamlangProcessorDefinitionWithUIAttributes;
    onSave: (description: string) => void;
    onCancel: () => void;
}
export declare const EditStepDescriptionModal: React.FC<EditStepDescriptionModalProps>;
