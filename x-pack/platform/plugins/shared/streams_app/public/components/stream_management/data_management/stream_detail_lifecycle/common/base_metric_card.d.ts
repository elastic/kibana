import React from 'react';
interface Metric {
    data: React.ReactNode;
    subtitle: string | string[] | React.ReactNode | null;
    'data-test-subj'?: string;
}
interface BaseMetricCardProps {
    title: React.ReactNode;
    actions?: React.ReactNode;
    metrics: Metric[];
    'data-test-subj'?: string;
}
export declare const BaseMetricCard: React.FC<BaseMetricCardProps>;
export {};
