import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import { StreamsTelemetryClient } from './client';
export declare class StreamsTelemetryService {
    private analytics?;
    constructor();
    setup(analytics: AnalyticsServiceSetup): void;
    getClient(): StreamsTelemetryClient;
}
