import type { CasesTelemetry, CollectTelemetryDataParams } from '../types';
export declare const getCasesSystemActionData: ({ savedObjectsClient, }: CollectTelemetryDataParams) => Promise<CasesTelemetry["casesSystemAction"]>;
