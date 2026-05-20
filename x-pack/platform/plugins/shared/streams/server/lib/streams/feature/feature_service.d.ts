import type { CoreSetup, Logger } from '@kbn/core/server';
import type { StreamsPluginStartDependencies } from '../../../types';
import type { FeatureClient } from './feature_client';
import { type SigEventsTuningConfig } from '../../../../common/sig_events_tuning_config';
export declare class FeatureService {
    private readonly coreSetup;
    private readonly logger;
    constructor(coreSetup: CoreSetup<StreamsPluginStartDependencies>, logger: Logger);
    getClient(config?: Pick<SigEventsTuningConfig, 'feature_ttl_days' | 'semantic_min_score' | 'rrf_rank_constant'>): Promise<FeatureClient>;
}
