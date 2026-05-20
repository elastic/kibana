import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { Output } from '../../../common/types';
import type { NewOutput } from '../../../common';
import type { SecretReference } from '../../types';
export declare function isOutputSecretStorageEnabled(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract): Promise<boolean>;
export declare function extractAndWriteOutputSecrets(opts: {
    output: NewOutput;
    esClient: ElasticsearchClient;
    secretHashes?: Record<string, any>;
}): Promise<{
    output: NewOutput;
    secretReferences: SecretReference[];
}>;
export declare function extractAndUpdateOutputSecrets(opts: {
    oldOutput: Output;
    outputUpdate: Partial<Output>;
    esClient: ElasticsearchClient;
    secretHashes?: Record<string, any>;
}): Promise<{
    outputUpdate: Partial<Output>;
    secretReferences: SecretReference[];
    secretsToDelete: SecretReference[];
}>;
export declare function deleteOutputSecrets(opts: {
    output: Output;
    esClient: ElasticsearchClient;
}): Promise<void>;
export declare function getOutputSecretReferences(output: Output): SecretReference[];
