import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { TelemetryServiceSetupParams, ITelemetryClient } from './types';
/**
 * Service that interacts with the Core's analytics module
 */
export declare class TelemetryService {
    private analytics?;
    constructor(analytics?: AnalyticsServiceSetup | undefined);
    setup({ analytics }: TelemetryServiceSetupParams): void;
    start(): ITelemetryClient;
}
