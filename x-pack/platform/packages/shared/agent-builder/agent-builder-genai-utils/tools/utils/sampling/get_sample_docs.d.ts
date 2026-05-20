import type { QueryDslFieldAndFormat } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
export interface SampleDoc {
    index: string;
    id: string;
    /** aggregated fields + _source */
    values: Record<string, Array<string | number | boolean>>;
}
/**
 * Return sample documents from the specified index, alias or datastream
 */
export declare const getSampleDocs: ({ index, size, _source, fields, esClient, }: {
    index: string | string[];
    size?: number;
    _source?: boolean;
    fields?: QueryDslFieldAndFormat[];
    esClient: ElasticsearchClient;
}) => Promise<{
    samples: SampleDoc[];
}>;
