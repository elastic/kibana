import type { ElasticsearchClient } from '@kbn/core/server';
import { EventClient } from './event_client';
export declare class EventService {
    getClient({ esClient, space }: {
        esClient: ElasticsearchClient;
        space: string;
    }): EventClient;
}
