import type { FC } from 'react';
import type { StatsBarStat } from './stat';
interface Stats {
    total: StatsBarStat;
    failed: StatsBarStat;
}
export interface JobStatsBarStats extends Stats {
    activeNodes: StatsBarStat;
    open: StatsBarStat;
    closed: StatsBarStat;
    activeDatafeeds: StatsBarStat;
}
export interface AnalyticStatsBarStats extends Stats {
    started: StatsBarStat;
    stopped: StatsBarStat;
}
export interface ModelsBarStats {
    total: StatsBarStat;
}
export type StatsBarStats = JobStatsBarStats | AnalyticStatsBarStats | ModelsBarStats;
interface StatsBarProps {
    stats: StatsBarStats;
    dataTestSub: string;
}
export declare const StatsBar: FC<StatsBarProps>;
export {};
