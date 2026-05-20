import type { CoreSetup, ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { StreamsPluginStartDependencies } from '../../../../types';
import type { QueryClient } from './query_client';
import { type SigEventsTuningConfig } from '../../../../../common/sig_events_tuning_config';
export declare class QueryService {
    private readonly coreSetup;
    private readonly logger;
    constructor(coreSetup: CoreSetup<StreamsPluginStartDependencies>, logger: Logger);
    getClient({ esClient, soClient, rulesClient, config, }: {
        esClient: ElasticsearchClient;
        soClient: SavedObjectsClientContract;
        rulesClient: RulesClient;
        config?: Pick<SigEventsTuningConfig, 'semantic_min_score' | 'rrf_rank_constant'>;
    }): Promise<QueryClient>;
}
