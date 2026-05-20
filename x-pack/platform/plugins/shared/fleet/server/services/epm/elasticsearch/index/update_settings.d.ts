import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { IndicesIndexSettings } from '@elastic/elasticsearch/lib/api/types';
export declare function updateIndexSettings(esClient: ElasticsearchClient, index: string, settings: IndicesIndexSettings): Promise<void>;
