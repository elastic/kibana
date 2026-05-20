import type { PropsWithChildren } from 'react';
import React, { type FC } from 'react';
export interface CollapsiblePanelProps {
    isOpen: boolean;
    onToggle: (isOpen: boolean) => void;
    header: React.ReactElement;
    headerItems?: React.ReactElement[];
    ariaLabel: string;
    dataTestSubj?: string;
}
export declare const CollapsiblePanel: FC<PropsWithChildren<CollapsiblePanelProps>>;
export interface StatEntry {
    label: string;
    value: number | string;
    'data-test-subj'?: string;
}
export interface OverviewStatsBarProps {
    inputStats: StatEntry[];
    dataTestSub?: string;
}
export declare const OverviewStatsBar: FC<OverviewStatsBarProps>;
