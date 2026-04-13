import React from 'react';
interface BaseIngestionCardProps {
    period: 'daily' | 'monthly';
    hasPrivileges: boolean;
    bytesPerDay?: number;
    perDayDocs?: number;
    statsError?: Error;
    tooltipContent: React.ReactNode;
    dataTestSubjPrefix: string;
}
export declare const BaseIngestionCard: ({ period, hasPrivileges, bytesPerDay, perDayDocs, statsError, tooltipContent, dataTestSubjPrefix, }: BaseIngestionCardProps) => React.JSX.Element;
export {};
