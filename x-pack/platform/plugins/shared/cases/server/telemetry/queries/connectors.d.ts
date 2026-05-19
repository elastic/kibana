import type { CasesTelemetry, CollectTelemetryDataParams } from '../types';
export declare const getConnectorsTelemetryData: ({ savedObjectsClient, }: CollectTelemetryDataParams) => Promise<CasesTelemetry["connectors"]>;
