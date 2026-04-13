import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import type { PartitionSuggestion, UseReviewSuggestionsFormResult } from './use_review_suggestions_form';
import type { AIFeatures } from '../../../../hooks/use_ai_features';
export interface ReviewSuggestionsFormProps extends Pick<UseReviewSuggestionsFormResult, 'resetForm' | 'isLoadingSuggestions' | 'previewSuggestion' | 'acceptSuggestion' | 'rejectSuggestion' | 'updateSuggestion'> {
    suggestions: PartitionSuggestion[];
    onRegenerate: (connectorId: string) => void;
    definition: Streams.WiredStream.GetResponse;
    aiFeatures: AIFeatures;
}
export declare function ReviewSuggestionsForm({ definition, aiFeatures, resetForm, suggestions, isLoadingSuggestions, previewSuggestion, acceptSuggestion, rejectSuggestion, updateSuggestion, onRegenerate, }: ReviewSuggestionsFormProps): React.JSX.Element;
