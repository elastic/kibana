import React from 'react';
import { useExecuteQueryStreamPreview } from '../../../hooks/use_execute_query_stream_preview';
export type QueryStreamCreationState = ReturnType<typeof useExecuteQueryStreamPreview>;
/**
 * Provider for query stream creation state.
 * This shares preview data between the form and preview panel components.
 */
export declare function QueryStreamCreationProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
/**
 * Hook to access query stream creation state.
 * Must be used within QueryStreamCreationProvider.
 */
export declare function useQueryStreamCreation(): QueryStreamCreationState;
