import type { CasesTelemetry, CollectTelemetryDataParams } from './types';
export declare const collectTelemetryData: ({ savedObjectsClient, logger, }: CollectTelemetryDataParams) => Promise<Partial<CasesTelemetry>>;
