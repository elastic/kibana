import React from 'react';
import type { AIFeatures } from '../../../../hooks/use_ai_features';
import type { PartitionSuggestionReason } from './use_review_suggestions_form';
export declare function NoSuggestionsCallout({ aiFeatures, isLoadingSuggestions, onRegenerate, onDismiss, isDisabled, reason, }: {
    aiFeatures: AIFeatures;
    isLoadingSuggestions: boolean;
    onRegenerate: (connectorId: string) => void;
    onDismiss: () => void;
    isDisabled?: boolean;
    reason?: PartitionSuggestionReason;
}): React.JSX.Element;
