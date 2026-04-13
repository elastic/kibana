import React from 'react';
/**
 * Props for the InlineQueryStreamForm component
 */
export interface InlineQueryStreamFormProps {
    /**
     * The parent stream name (used to generate child stream naming)
     */
    parentStreamName: string;
    /**
     * Initial name for the query stream (suffix only, without parent prefix)
     */
    initialName?: string;
    /**
     * Initial ES|QL query
     */
    initialEsqlQuery?: string;
    /**
     * Callback when save is clicked with the form data
     */
    onSave: (data: {
        name: string;
        esqlQuery: string;
    }) => void | Promise<void>;
    /**
     * Callback when cancel is clicked
     */
    onCancel: () => void;
    /**
     * Callback when query changes (for live preview)
     */
    onQueryChange?: (esqlQuery: string) => void;
    /**
     * Whether the form is currently saving
     */
    isSaving?: boolean;
    /**
     * Whether the form fields should be read-only
     */
    readOnly?: boolean;
}
/**
 * A reusable inline form component for creating or editing query streams.
 * This component manages its own form state and is not coupled to any specific
 * state management solution, making it reusable across different contexts.
 *
 * @example
 * ```tsx
 * <InlineQueryStreamForm
 *   parentStreamName="logs"
 *   onSave={async ({ name, esqlQuery }) => {
 *     await createQueryStream(name, esqlQuery);
 *   }}
 *   onCancel={() => setIsCreating(false)}
 *   isSaving={isLoading}
 * />
 * ```
 */
export declare function InlineQueryStreamForm({ parentStreamName, initialName, initialEsqlQuery, onSave, onCancel, onQueryChange, isSaving, readOnly, }: InlineQueryStreamFormProps): React.JSX.Element;
