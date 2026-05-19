import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { AgentAction, NewAgentAction, SecretReference } from '../../../common/types';
export declare function isActionSecretStorageEnabled(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract): Promise<boolean>;
/**
 * Given a new agent action, extracts the secrets, stores them in saved objects,
 * and returns the action with secrets replaced by references to the saved objects.
 */
export declare function extractAndWriteActionSecrets(opts: {
    action: NewAgentAction;
    esClient: ElasticsearchClient;
    secretHashes?: Record<string, any>;
}): Promise<{
    actionWithSecrets: NewAgentAction;
    secretReferences: SecretReference[];
}>;
/**
 * Deletes secrets for a given agent action.
 * This function is currently not used, but implemented for completeness.
 */
export declare function deleteActionSecrets(opts: {
    action: AgentAction;
    esClient: ElasticsearchClient;
}): Promise<void>;
