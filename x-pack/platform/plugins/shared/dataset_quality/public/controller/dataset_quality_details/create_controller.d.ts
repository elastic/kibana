import type { CoreStart } from '@kbn/core/public';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { DataStreamDetailsServiceStart } from '../../services/data_stream_details';
import type { DatasetQualityStartDeps } from '../../types';
import type { DatasetQualityDetailsController, DatasetQualityDetailsPublicStateUpdate } from './types';
interface Dependencies {
    core: CoreStart;
    plugins: DatasetQualityStartDeps;
    dataStreamDetailsService: DataStreamDetailsServiceStart;
}
export declare const createDatasetQualityDetailsControllerFactory: ({ core, plugins, dataStreamDetailsService }: Dependencies) => ({ initialState, streamsRepositoryClient, refreshDefinition, }: {
    initialState: DatasetQualityDetailsPublicStateUpdate;
    streamsRepositoryClient?: StreamsRepositoryClient;
    refreshDefinition?: () => void;
}) => Promise<DatasetQualityDetailsController>;
export type CreateDatasetQualityDetailsControllerFactory = typeof createDatasetQualityDetailsControllerFactory;
export type CreateDatasetQualityDetailsController = ReturnType<typeof createDatasetQualityDetailsControllerFactory>;
export {};
