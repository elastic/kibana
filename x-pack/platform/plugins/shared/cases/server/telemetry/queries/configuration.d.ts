import type { CasesTelemetry, CollectTelemetryDataParams } from '../types';
export declare const getConfigurationTelemetryData: ({ savedObjectsClient, }: CollectTelemetryDataParams) => Promise<CasesTelemetry["configuration"]>;
