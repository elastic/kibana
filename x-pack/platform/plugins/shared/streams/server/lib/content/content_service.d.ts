import type { CoreSetup, Logger } from '@kbn/core/server';
import type { StreamsPluginStartDependencies } from '../../types';
import { ContentClient } from './content_client';
export declare class ContentService {
    private readonly coreSetup;
    private readonly logger;
    constructor(coreSetup: CoreSetup<StreamsPluginStartDependencies>, logger: Logger);
    getClient(): Promise<ContentClient>;
}
