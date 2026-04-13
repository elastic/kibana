import React from 'react';
import type { SampleDocument } from '@kbn/streams-schema';
interface QueryStreamPreviewPanelProps {
    documents?: SampleDocument[];
    isLoading: boolean;
    error: Error | undefined;
}
export declare function QueryStreamPreviewPanel({ documents, isLoading, error, }: QueryStreamPreviewPanelProps): React.JSX.Element;
export {};
