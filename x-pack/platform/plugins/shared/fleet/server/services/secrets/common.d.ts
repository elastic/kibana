import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { Secret, SOSecretPath, BaseSettings } from '../../../common/types';
import type { SecretReference } from '../../types';
type SecretStorageSettingsKey = Extract<keyof BaseSettings, 'secret_storage_requirements_met' | 'output_secret_storage_requirements_met' | 'action_secret_storage_requirements_met' | 'ssl_secret_storage_requirements_met' | 'download_source_auth_secret_storage_requirements_met'>;
export interface SecretStorageCheckOptions {
    esClient: ElasticsearchClient;
    soClient: SavedObjectsClientContract;
    /**
     * A human-readable name for the feature (used in logging).
     * Defaults to "Secrets".
     */
    featureName?: string;
    /**
     * The minimum fleet server version required for this secret storage feature.
     * Defaults to SECRETS_MINIMUM_FLEET_SERVER_VERSION.
     */
    minimumFleetServerVersion?: string;
    /**
     * The setting key to check/update for this feature.
     * Defaults to 'secret_storage_requirements_met'.
     */
    settingKey?: SecretStorageSettingsKey;
}
export declare function isSecretStorageEnabledForFeature(opts: SecretStorageCheckOptions): Promise<boolean>;
export declare function isSecretStorageEnabled(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract): Promise<boolean>;
export declare function createSecrets(opts: {
    esClient: ElasticsearchClient;
    values: Array<string | string[]>;
}): Promise<Array<Secret | Secret[]>>;
export declare function deleteSecrets(opts: {
    esClient: ElasticsearchClient;
    ids: string[];
}): Promise<void>;
export declare function toCompiledSecretRef(id: string): string;
/**
 * Given an array of secret paths, deletes the corresponding secrets
 */
export declare function deleteSOSecrets(esClient: ElasticsearchClient, secretPaths: SOSecretPath[]): Promise<void>;
/**
 * Takes a generic object T and its secret paths
 * Creates new secrets and returns the references
 */
export declare function extractAndWriteSOSecrets<T>(opts: {
    soObject: T;
    esClient: ElasticsearchClient;
    secretPaths: SOSecretPath[];
    secretHashes?: Record<string, any>;
}): Promise<{
    soObjectWithSecrets: T;
    secretReferences: SecretReference[];
}>;
/**
 * Takes a generic object T to update and its old and new secret paths
 * Updates secrets and returns the references
 */
export declare function extractAndUpdateSOSecrets<T>(opts: {
    updatedSoObject: Partial<T>;
    oldSecretPaths: SOSecretPath[];
    updatedSecretPaths: SOSecretPath[];
    esClient: ElasticsearchClient;
    secretHashes?: Record<string, any>;
}): Promise<{
    updatedSoObject: Partial<T>;
    secretReferences: SecretReference[];
    secretsToDelete: SecretReference[];
}>;
/**
 * Makes the diff betwwen old and new secrets paths
 */
export declare function diffSOSecretPaths(oldPaths: SOSecretPath[], newPaths: SOSecretPath[]): {
    toCreate: SOSecretPath[];
    toDelete: SOSecretPath[];
    noChange: SOSecretPath[];
};
export {};
