import type { DataStreamStat } from '../../common/data_streams_stats';
interface FilterInactiveDatasetsOptions {
    datasets: DataStreamStat[];
    timeRange?: {
        from: string;
        to: string;
    };
}
export declare const filterInactiveDatasets: ({ datasets, timeRange, }: FilterInactiveDatasetsOptions) => DataStreamStat[];
interface IsActiveDatasetOptions {
    lastActivity: number;
    timeRange: {
        from: string;
        to: string;
    };
}
export declare const isActiveDataset: (options: IsActiveDatasetOptions) => boolean;
export {};
