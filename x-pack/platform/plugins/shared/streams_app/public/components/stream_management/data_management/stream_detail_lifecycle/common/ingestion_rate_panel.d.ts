import React from 'react';
interface IngestionRatePanelProps {
    isLoading: boolean;
    hasAggregations: boolean;
    children: React.ReactNode;
}
export declare function IngestionRatePanel({ isLoading, hasAggregations, children, }: IngestionRatePanelProps): React.JSX.Element;
export {};
