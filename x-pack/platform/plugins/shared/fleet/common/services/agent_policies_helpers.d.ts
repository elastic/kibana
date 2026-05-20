import type { NewAgentPolicy, AgentPolicy } from '../types';
export declare function getDefaultFleetServerpolicyId(spaceId?: string): string;
export declare function policyHasFleetServer(agentPolicy: Pick<AgentPolicy, 'package_policies' | 'has_fleet_server'>): boolean;
export declare function policyHasAPMIntegration(agentPolicy: AgentPolicy): boolean;
export declare function policyHasSyntheticsIntegration(agentPolicy: AgentPolicy): boolean;
export declare function policyHasEndpointSecurity(agentPolicy: Partial<NewAgentPolicy | AgentPolicy>): boolean;
export declare function getInheritedNamespace(agentPolicies: AgentPolicy[], defaultValue?: string): string;
