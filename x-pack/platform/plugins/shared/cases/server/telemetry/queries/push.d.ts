import type { CasesTelemetry, CollectTelemetryDataParams } from '../types';
export declare const getPushedTelemetryData: ({ savedObjectsClient, }: CollectTelemetryDataParams) => Promise<CasesTelemetry["pushes"]>;
