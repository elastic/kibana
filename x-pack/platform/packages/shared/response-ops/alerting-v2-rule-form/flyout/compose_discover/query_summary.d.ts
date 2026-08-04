import React from 'react';
export declare const getQuerySummaryOverflowHeight: (query: string) => number | undefined;
interface QuerySummaryProps {
    query: string;
    emptyMessage?: string;
}
export declare const QuerySummary: React.FC<QuerySummaryProps>;
interface QueryBlockProps {
    label: React.ReactNode;
    query: string;
    emptyMessage?: string;
}
export declare const QueryBlock: React.FC<QueryBlockProps>;
export {};
