import React from 'react';
export interface StatItem {
    /** The large headline value (already formatted). */
    title: string;
    /** The label rendered beneath the value. */
    description: string;
    dataTestSubj: string;
}
export interface StatsRowProps {
    stats: StatItem[];
    ['data-test-subj']?: string;
}
/**
 * Presentational KPI row: evenly distributed {@link EuiStat} cards. Holds no
 * data-shape opinion so it can back both the episode overview (lifecycle
 * metrics) and the signal overview (firing metrics).
 */
export declare const StatsRow: React.FC<StatsRowProps>;
