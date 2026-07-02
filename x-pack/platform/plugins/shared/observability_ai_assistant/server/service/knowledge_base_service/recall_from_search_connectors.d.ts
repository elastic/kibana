import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type { Logger } from '@kbn/logging';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { RecalledEntry } from '.';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
export declare function recallFromSearchConnectors({ queries, esClient, uiSettingsClient, logger, core, }: {
    queries: Array<{
        text: string;
        boost?: number;
    }>;
    esClient: {
        asCurrentUser: ElasticsearchClient;
        asInternalUser: ElasticsearchClient;
    };
    uiSettingsClient: IUiSettingsClient;
    logger: Logger;
    core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
}): Promise<RecalledEntry[]>;
