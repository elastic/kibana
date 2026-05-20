import React from 'react';
import type { AggregateQuery } from '@kbn/es-query';
interface FieldStatsESQLEditorProps {
    canEditTextBasedQuery?: boolean;
    query: AggregateQuery;
    setQuery: (query: AggregateQuery) => void;
    onQuerySubmit: (query: AggregateQuery, abortController?: AbortController) => Promise<void>;
    disableSubmitAction?: boolean;
}
export declare const FieldStatsESQLEditor: ({ canEditTextBasedQuery, query, setQuery, onQuerySubmit, disableSubmitAction, }: FieldStatsESQLEditorProps) => React.JSX.Element | null;
export {};
