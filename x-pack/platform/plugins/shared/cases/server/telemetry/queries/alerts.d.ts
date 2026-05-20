import type { CasesTelemetry, CollectTelemetryDataParams } from '../types';
export declare const getAlertsTelemetryData: ({ savedObjectsClient, }: CollectTelemetryDataParams) => Promise<CasesTelemetry["alerts"]>;
