import React from 'react';
import { type PartitionSuggestion } from './use_review_suggestions_form';
export declare function CreateStreamConfirmationModal({ partition, onSuccess, }: {
    partition: PartitionSuggestion;
    onSuccess: () => void;
}): React.JSX.Element;
