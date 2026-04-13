import type { CoreStart } from '@kbn/core/public';
import type { DataStreamsStatsServiceStart } from '../../services/data_streams_stats';
import type { DatasetQualityController, DatasetQualityPublicStateUpdate } from './types';
type InitialState = DatasetQualityPublicStateUpdate;
interface Dependencies {
    core: CoreStart;
    dataStreamStatsService: DataStreamsStatsServiceStart;
}
export declare const createDatasetQualityControllerFactory: ({ core, dataStreamStatsService }: Dependencies) => ({ initialState, }: {
    initialState?: InitialState;
}) => Promise<DatasetQualityController>;
export type CreateDatasetQualityControllerFactory = typeof createDatasetQualityControllerFactory;
export type CreateDatasetQualityController = ReturnType<typeof createDatasetQualityControllerFactory>;
export {};
