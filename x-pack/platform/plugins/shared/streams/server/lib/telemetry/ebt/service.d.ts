import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { EbtTelemetryClient } from './client';
export declare class EbtTelemetryService {
    private analytics?;
    constructor();
    setup(analytics: AnalyticsServiceSetup): void;
    getClient(): EbtTelemetryClient;
}
