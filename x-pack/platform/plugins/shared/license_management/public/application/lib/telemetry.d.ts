import type { TelemetryPluginStart } from '@kbn/telemetry-plugin/public';
export type { TelemetryPluginStart } from '@kbn/telemetry-plugin/public';
export { shouldShowTelemetryOptIn };
declare function shouldShowTelemetryOptIn(telemetry?: TelemetryPluginStart): telemetry is TelemetryPluginStart;
