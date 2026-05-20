import type { CoreSetup, Logger } from '@kbn/core/server';
import type { StreamsPluginStartDependencies } from '../../../../types';
import type { InsightClient } from './insight_client';
export declare class InsightService {
    private readonly coreSetup;
    private readonly logger;
    constructor(coreSetup: CoreSetup<StreamsPluginStartDependencies>, logger: Logger);
    getInternalClient(): Promise<InsightClient>;
}
