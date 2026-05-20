import type { CoreSetup, IUiSettingsClient, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { StreamsPluginStartDependencies } from '../../types';
import type { QueryClient } from './assets/query/query_client';
import { StreamsClient } from './client';
import type { AttachmentClient } from './attachments/attachment_client';
import type { FeatureClient } from './feature';
export declare class StreamsService {
    private readonly coreSetup;
    private readonly logger;
    private readonly isDev;
    constructor(coreSetup: CoreSetup<StreamsPluginStartDependencies>, logger: Logger, isDev: boolean);
    getClient({ attachmentClient, getQueryClient, getFeatureClient, esClient, esClientAsInternalUser, uiSettingsClient, isSecurityEnabled, }: {
        attachmentClient: AttachmentClient;
        getQueryClient?: () => Promise<QueryClient>;
        getFeatureClient?: () => Promise<FeatureClient>;
        esClient: ElasticsearchClient;
        esClientAsInternalUser: ElasticsearchClient;
        uiSettingsClient: IUiSettingsClient;
        isSecurityEnabled: boolean;
    }): Promise<StreamsClient>;
}
