import type { CoreSetup, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { StreamsPluginStartDependencies } from '../../../types';
import { AttachmentClient } from './attachment_client';
export declare class AttachmentService {
    private readonly coreSetup;
    private readonly logger;
    constructor(coreSetup: CoreSetup<StreamsPluginStartDependencies>, logger: Logger);
    getClient({ rulesClient, soClient, }: {
        rulesClient: RulesClient;
        soClient: SavedObjectsClientContract;
    }): Promise<AttachmentClient>;
}
