import React from 'react';
export declare const LogQueryBar: React.FunctionComponent<{
    query: string;
    isQueryValid: boolean;
    onUpdateQuery: (query: string, runQuery?: boolean) => void;
}>;
