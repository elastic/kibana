import type { DataSourceMachineDeps } from './types';
import type { EnrichmentDataSourceWithUIAttributes } from '../../types';
export interface SamplesFetchInput {
    dataSource: EnrichmentDataSourceWithUIAttributes;
    streamName: string;
    streamType: 'wired' | 'classic' | 'unknown';
}
/**
 * Creates a data collector actor that fetches sample documents based on the data source type
 */
export declare function createDataCollectorActor({ data, telemetryClient, streamsRepositoryClient, }: Pick<DataSourceMachineDeps, 'data' | 'telemetryClient' | 'streamsRepositoryClient'>): import("xstate").ObservableActorLogic<import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[], SamplesFetchInput, import("xstate").EventObject>;
/**
 * Creates a notifier for data collection failures
 */
export declare function createDataCollectionFailureNotifier({ toasts, }: {
    toasts: DataSourceMachineDeps['toasts'];
}): (params: {
    event: unknown;
}) => void;
