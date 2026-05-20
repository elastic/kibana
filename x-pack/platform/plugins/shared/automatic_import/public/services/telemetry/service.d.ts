import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { AutomaticImportTelemetryEventType, AutomaticImportTelemetryEventPayload } from '../../../common/telemetry/types';
/**
 * Type-safe telemetry service for reporting Automatic Import analytics events.
 */
export interface AutomaticImportTelemetryService {
    /**
     * Report a telemetry event with type-checked payload.
     */
    reportEvent: <T extends AutomaticImportTelemetryEventType>(eventType: T, eventData: AutomaticImportTelemetryEventPayload<T>) => void;
}
export declare class AutomaticImportTelemetry {
    private analytics?;
    setup(analytics: AnalyticsServiceSetup): void;
    start(): AutomaticImportTelemetryService;
}
