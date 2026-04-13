import type { DataStreamDetailsServiceSetup, DataStreamDetailsServiceStartDeps, DataStreamDetailsServiceStart } from './types';
export declare class DataStreamDetailsService {
    private client?;
    setup(): DataStreamDetailsServiceSetup;
    start({ http, telemetryClient, }: DataStreamDetailsServiceStartDeps): DataStreamDetailsServiceStart;
    private getClient;
}
