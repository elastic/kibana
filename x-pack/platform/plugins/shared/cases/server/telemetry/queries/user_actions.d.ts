import type { CasesTelemetry, CollectTelemetryDataParams } from '../types';
export declare const getUserActionsTelemetryData: ({ savedObjectsClient, }: CollectTelemetryDataParams) => Promise<CasesTelemetry["userActions"]>;
