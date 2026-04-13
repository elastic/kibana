import React from 'react';
import type { UseFormSetValue, FieldValues } from 'react-hook-form';
import type { DissectProcessorResult } from '@kbn/dissect-heuristics';
import type { APIReturnType } from '@kbn/streams-plugin/public/api';
import type { AIFeatures } from '../../../../../../../hooks/use_ai_features';
export declare const DissectPatternAISuggestions: ({ aiFeatures, setValue, }: {
    aiFeatures: AIFeatures;
    setValue: UseFormSetValue<FieldValues>;
}) => React.JSX.Element;
export interface DissectPatternSuggestionProps {
    dissectProcessor: DissectProcessorResult;
    simulationResult: APIReturnType<'POST /internal/streams/{name}/processing/_simulate'>;
    onAccept(): void;
    onDismiss(): void;
}
export declare function DissectPatternSuggestion({ dissectProcessor, simulationResult, onAccept, onDismiss, }: DissectPatternSuggestionProps): React.JSX.Element;
