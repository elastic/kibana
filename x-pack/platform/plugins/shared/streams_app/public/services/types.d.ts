import type { IDataStreamsStatsClient } from '@kbn/dataset-quality-plugin/public';
import type { StreamsTelemetryClient } from '../telemetry/client';
export interface StreamsAppServices {
    dataStreamsClient: Promise<IDataStreamsStatsClient>;
    telemetryClient: StreamsTelemetryClient;
    version: string;
}
