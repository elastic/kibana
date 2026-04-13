import React from 'react';
import type { GrokCollection } from '@kbn/grok-ui';
import type { UseFormSetValue } from 'react-hook-form';
import type { GrokProcessorResult } from '@kbn/grok-heuristics';
import type { APIReturnType } from '@kbn/streams-plugin/public/api';
import type { GrokFormState } from '../../../../types';
import type { AIFeatures } from '../../../../../../../hooks/use_ai_features';
export declare const GrokPatternAISuggestions: ({ aiFeatures, grokCollection, setValue, onAddPattern, }: {
    aiFeatures: AIFeatures;
    grokCollection: GrokCollection;
    setValue: UseFormSetValue<GrokFormState>;
    onAddPattern: () => void;
}) => React.JSX.Element;
export interface GrokPatternSuggestionProps {
    grokProcessor: GrokProcessorResult;
    simulationResult: APIReturnType<'POST /internal/streams/{name}/processing/_simulate'>;
    onAccept(): void;
    onDismiss(): void;
}
export declare function GrokPatternSuggestion({ grokProcessor, simulationResult, onAccept, onDismiss, }: GrokPatternSuggestionProps): React.JSX.Element;
