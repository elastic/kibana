import type { DataStreamsStatsServiceSetup, DataStreamsStatsServiceStartDeps, DataStreamsStatsServiceStart } from './types';
export declare class DataStreamsStatsService {
    private client?;
    setup(): DataStreamsStatsServiceSetup;
    start({ http, telemetryClient, }: DataStreamsStatsServiceStartDeps): DataStreamsStatsServiceStart;
    private getClient;
}
