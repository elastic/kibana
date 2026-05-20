import type { RootSchema } from '@kbn/core-analytics-browser';
import type { AutomaticImportTelemetryEventType } from '../../../common/telemetry/types';
/**
 * EBT schema definitions for browser-side telemetry events.
 * These schemas define the structure of event payloads for BigQuery.

 */
export declare const telemetryEventsSchemas: Partial<Record<AutomaticImportTelemetryEventType, RootSchema<object>>>;
