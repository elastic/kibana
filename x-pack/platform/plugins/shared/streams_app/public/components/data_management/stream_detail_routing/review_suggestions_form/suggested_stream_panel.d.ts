import React from 'react';
import { type Streams } from '@kbn/streams-schema';
import type { PartitionSuggestion } from './use_review_suggestions_form';
export declare function SuggestedStreamPanel({ definition, partition, onDismiss, onPreview, index, onEdit, onSave, }: {
    definition: Streams.WiredStream.GetResponse;
    partition: PartitionSuggestion;
    onDismiss(): void;
    onPreview(toggle: boolean): void;
    index: number;
    onEdit(index: number, suggestion: PartitionSuggestion): void;
    onSave?: (suggestion: PartitionSuggestion) => void;
}): React.JSX.Element;
