import React from 'react';
import { type DocumentMatchFilterOptions } from './state_management/stream_routing_state_machine';
export interface DocumentMatchFilterControlsProps {
    onFilterChange: (filter: DocumentMatchFilterOptions) => void;
    matchedDocumentPercentage?: number | null;
    isDisabled?: boolean;
}
export declare const DocumentMatchFilterControls: ({ onFilterChange, matchedDocumentPercentage, isDisabled, }: DocumentMatchFilterControlsProps) => React.JSX.Element | null;
