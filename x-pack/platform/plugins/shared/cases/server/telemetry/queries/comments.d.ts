import type { CasesTelemetry, CollectTelemetryDataParams } from '../types';
export declare const getUserCommentsTelemetryData: ({ savedObjectsClient, }: CollectTelemetryDataParams) => Promise<CasesTelemetry["comments"]>;
