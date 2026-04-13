import type { IScopedClusterClient } from '@kbn/core/server';
import type { DataStreamDetails } from '../../../../common/api_types';
export declare function getDataStreamDetails({ esClient, dataStream, start, end, isServerless, }: {
    esClient: IScopedClusterClient;
    dataStream: string;
    start: number;
    end: number;
    isServerless: boolean;
}): Promise<DataStreamDetails>;
