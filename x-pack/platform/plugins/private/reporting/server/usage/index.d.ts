import type { LicenseType } from '@kbn/licensing-types';
export interface FeaturesAvailability {
    isAvailable: () => boolean;
    license: {
        getType: () => LicenseType | undefined;
    };
}
export type GetLicense = () => Promise<FeaturesAvailability>;
export { EventTracker } from './event_tracker';
export { registerReportingEventTypes } from './register_event_types';
export { registerReportingUsageCollector } from './reporting_usage_collector';
export { initializeReportingTelemetryTask, scheduleReportingTelemetry } from './task';
