import React from 'react';
import type { AIFeatures } from '../../../../hooks/use_ai_features';
export interface PipelineSuggestionProps {
    aiFeatures: AIFeatures;
    onAccept(): void;
    onDismiss(): void;
    onRegenerate(connectorId: string): void;
}
export declare function PipelineSuggestion({ aiFeatures, onAccept, onDismiss, onRegenerate, }: PipelineSuggestionProps): React.JSX.Element;
