import type { CollectTelemetryDataParams, CasesTelemetry, LatestDates } from '../types';
export declare const getLatestCasesDates: ({ savedObjectsClient, }: CollectTelemetryDataParams) => Promise<LatestDates>;
export declare const getCasesTelemetryData: ({ savedObjectsClient, logger, }: CollectTelemetryDataParams) => Promise<CasesTelemetry["cases"]>;
