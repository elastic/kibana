import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CloudProvider, CloudConnectorVars, PackageInfo } from '../../../common/types';
import type { NewPackagePolicy } from '../../types';
/**
 * Extracts cloud connector variables from a package policy's inputs and creates secrets for non-secret-ref values
 * This function handles cloud connector secret creation separately from package policy secrets,
 * decoupling cloud connector secret handling from extractAndWriteSecrets.
 *
 * @param cloudProvider - The cloud provider (aws, azure, gcp)
 * @param packagePolicy - The package policy containing cloud connector vars
 * @param packageInfo - The package info for storage mode detection
 * @param esClient - Elasticsearch client for creating secrets
 * @param logger - Logger instance
 * @returns CloudConnectorVars with secret references populated
 */
export declare function extractAndCreateCloudConnectorSecrets(cloudProvider: CloudProvider, packagePolicy: NewPackagePolicy, packageInfo: PackageInfo, esClient: ElasticsearchClient, logger: Logger): Promise<CloudConnectorVars | undefined>;
/**
 * Extracts secret IDs from cloud connector variables for cleanup during deletion
 * This function handles extracting secret references from AWS, Azure, and GCP cloud connectors.
 *
 * @param cloudProvider - The cloud provider (aws, azure, gcp)
 * @param cloudConnectorVars - The cloud connector variables containing secret references
 * @returns Array of secret IDs to delete
 */
export declare function extractSecretIdsFromCloudConnectorVars(cloudProvider: CloudProvider, cloudConnectorVars: CloudConnectorVars): string[];
