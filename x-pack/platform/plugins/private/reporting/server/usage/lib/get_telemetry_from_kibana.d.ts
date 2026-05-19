import type { AggregationsStringTermsBucketKeys, AggregationsBuckets } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ReportingUsage } from '../types';
interface Opts {
    esClient: ElasticsearchClient;
    index: string;
    logger: Logger;
}
type GetTotalCountsResults = Pick<ReportingUsage, 'number_of_scheduled_reports' | 'number_of_scheduled_reports_by_type' | 'number_of_enabled_scheduled_reports' | 'number_of_enabled_scheduled_reports_by_type' | 'number_of_scheduled_reports_with_notifications'> & {
    errorMessage?: string;
    hasErrors: boolean;
};
export declare function getTotalCountAggregations({ esClient, index, logger, }: Opts): Promise<GetTotalCountsResults>;
export declare function parseJobTypeBucket(jobTypeBuckets: AggregationsBuckets<AggregationsStringTermsBucketKeys>): Record<string, number>;
export {};
