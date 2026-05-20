import type { AnalyticsServiceSetup } from '@kbn/core/public';
import type { ITelemetryClient } from './types';
interface TelemetryServiceSetupParams {
    analytics: AnalyticsServiceSetup;
}
export declare class TelemetryService {
    private analytics?;
    private initialized;
    constructor();
    setup({ analytics }: TelemetryServiceSetupParams): void;
    start(): ITelemetryClient;
}
export {};
