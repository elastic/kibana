import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { PackageInfo } from '../../../common/types';
import type { AgentPolicy, NewPackagePolicy } from '../../types';
/**
 * Result of cloud connector integration with a package policy
 */
export interface CloudConnectorIntegrationResult {
    /** Updated package policy with cloud connector references */
    packagePolicy: NewPackagePolicy;
    /** ID of the cloud connector (created or reused) */
    cloudConnectorId?: string;
    /** Whether a new cloud connector was created (true) or an existing one was reused (false) */
    wasCreated: boolean;
}
/**
 * Creates or reuses a cloud connector and integrates it with a package policy for agentless workflows
 * Handles the complete integration flow:
 * - Checks if cloud connectors are enabled
 * - If package policy has cloud_connector_id: reuses existing connector and increments usage count
 * - If no cloud_connector_id: extracts and creates secrets, creates new cloud connector
 * - Updates package policy with secret references and cloud connector ID
 *
 * This function is designed for the agentless policy API but can be reused
 * in other contexts where cloud connectors need to be integrated with package policies.
 *
 * @param params - Integration parameters
 * @returns Updated package policy, cloud connector ID, and whether it was created or reused
 * @throws CloudConnectorCreateError if cloud connector creation or reuse fails
 */
export declare function createAndIntegrateCloudConnector(params: {
    packagePolicy: NewPackagePolicy;
    agentPolicy: AgentPolicy;
    policyName: string;
    packageInfo: PackageInfo;
    soClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
    logger: Logger;
    cloudConnectorName?: string;
    accountType?: 'single-account' | 'organization-account';
    policyTemplate?: string;
}): Promise<CloudConnectorIntegrationResult>;
