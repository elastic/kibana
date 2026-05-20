import type { CoreSetup, Logger } from '@kbn/core/server';
import { UsageStatsClient } from './usage_stats_client';
export interface UsageStatsServiceSetup {
    getClient(): UsageStatsClient;
}
interface UsageStatsServiceDeps {
    getStartServices: CoreSetup['getStartServices'];
}
export declare class UsageStatsService {
    private readonly log;
    constructor(log: Logger);
    setup({ getStartServices }: UsageStatsServiceDeps): Promise<UsageStatsServiceSetup>;
    stop(): Promise<void>;
}
export {};
