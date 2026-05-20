import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { DownloadSource, DownloadSourceBase } from '../../../common/types';
import type { SecretReference } from '../../types';
export declare function isDownloadSourceAuthSecretStorageEnabled(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract): Promise<boolean>;
export interface ExtractDownloadSourceSecretsOptions {
    downloadSource: DownloadSourceBase;
    esClient: ElasticsearchClient;
    secretHashes?: Record<string, any>;
    /**
     * If true, SSL secrets will be extracted and stored as secrets.
     * If false or undefined, SSL secrets will not be processed.
     */
    includeSSLSecrets?: boolean;
    /**
     * If true, auth secrets will be extracted and stored as secrets.
     * If false or undefined, auth secrets will not be processed.
     */
    includeAuthSecrets?: boolean;
}
export declare function extractAndWriteDownloadSourcesSecrets(opts: ExtractDownloadSourceSecretsOptions): Promise<{
    downloadSource: DownloadSourceBase;
    secretReferences: SecretReference[];
}>;
export interface UpdateDownloadSourceSecretsOptions {
    oldDownloadSource: DownloadSourceBase;
    downloadSourceUpdate: Partial<DownloadSourceBase>;
    esClient: ElasticsearchClient;
    secretHashes?: Record<string, any>;
    /**
     * If true, SSL secrets will be extracted and stored as secrets.
     * If false or undefined, SSL secrets will not be processed.
     */
    includeSSLSecrets?: boolean;
    /**
     * If true, auth secrets will be extracted and stored as secrets.
     * If false or undefined, auth secrets will not be processed.
     */
    includeAuthSecrets?: boolean;
}
export declare function extractAndUpdateDownloadSourceSecrets(opts: UpdateDownloadSourceSecretsOptions): Promise<{
    downloadSourceUpdate: Partial<DownloadSourceBase>;
    secretReferences: SecretReference[];
    secretsToDelete: SecretReference[];
}>;
export declare function deleteDownloadSourceSecrets(opts: {
    downloadSource: DownloadSourceBase;
    esClient: ElasticsearchClient;
}): Promise<void>;
export declare function getDownloadSourceSecretReferences(downloadSource: DownloadSource): SecretReference[];
