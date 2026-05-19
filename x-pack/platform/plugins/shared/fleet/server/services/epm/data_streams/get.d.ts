import type { ElasticsearchClient } from '@kbn/core/server';
import type { PackageDataStreamTypes } from '../../../../common/types';
export declare function getDataStreams(options: {
    esClient: ElasticsearchClient;
    type?: PackageDataStreamTypes;
    datasetQuery?: string;
    sortOrder: 'asc' | 'desc';
    uncategorisedOnly: boolean;
}): Promise<{
    items: {
        name: string;
    }[];
}>;
