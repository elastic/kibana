import type { ElasticsearchClient } from '@kbn/core/server';
export declare function writeDataToIndex(index: string, data: object, asCurrentUser: ElasticsearchClient): Promise<{
    success: boolean;
    data: object;
    error?: undefined;
} | {
    success: boolean;
    error: any;
    data?: undefined;
}>;
