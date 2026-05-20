import type { AgentPolicy } from '../../../types';
/**
 * Get the project id, organization id and account type of gcp integration from an agent policy
 */
export declare const getGcpIntegrationDetailsFromAgentPolicy: (selectedPolicy?: AgentPolicy) => {
    gcpProjectId: string | undefined;
    gcpOrganizationId: string | undefined;
    gcpAccountType: string | undefined;
};
