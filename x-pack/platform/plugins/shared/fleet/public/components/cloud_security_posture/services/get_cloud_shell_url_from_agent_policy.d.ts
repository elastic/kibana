import type { AgentPolicy } from '../../../types';
/**
 * Get the cloud shell url from a agent policy
 * It looks for a config with a cloud_shell_url object present in
 * the enabled package_policies inputs of the agent policy
 */
export declare const getCloudShellUrlFromAgentPolicy: (selectedPolicy?: AgentPolicy) => string | undefined;
