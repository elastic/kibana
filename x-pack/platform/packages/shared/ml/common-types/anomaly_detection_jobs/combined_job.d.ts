import type { Datafeed } from './datafeed';
import type { DatafeedStats } from './datafeed_stats';
import type { Job } from './job';
import type { JobStats } from './job_stats';
import type { JobAlertingRuleStats } from '../alerts';
export type JobWithStats = Job & JobStats & JobAlertingRuleStats;
export type DatafeedWithStats = Datafeed & DatafeedStats;
export interface CombinedJob extends Job {
    calendars?: string[];
    datafeed_config: Datafeed;
}
export interface CombinedJobWithStats extends JobWithStats {
    calendars?: string[];
    datafeed_config: DatafeedWithStats;
}
export declare function isCombinedJobWithStats(arg: any): arg is CombinedJobWithStats;
