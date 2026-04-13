import React from 'react';
interface IdleQueryStreamEntryProps {
    streamName: string;
    onEdit?: (name: string) => void;
}
/**
 * Displays an existing query stream in idle state
 */
export declare function IdleQueryStreamEntry({ streamName, onEdit }: IdleQueryStreamEntryProps): React.JSX.Element;
interface CreatingQueryStreamEntryProps {
    parentStreamName: string;
}
/**
 * Inline form for creating a new query stream within the routing page.
 * This component manages its own form state and uses the query stream creation context
 * for preview data, keeping the state machine integration minimal.
 */
export declare function CreatingQueryStreamEntry({ parentStreamName }: CreatingQueryStreamEntryProps): React.JSX.Element;
export {};
