import type { GetAutoUpgradeAgentsStatusResponse } from '../../../common/types/rest_spec/agent_policy';
import type { AgentClient } from './agent_service';
export declare function getAutoUpgradeAgentsStatus(agentClient: AgentClient, agentPolicyId: string): Promise<GetAutoUpgradeAgentsStatusResponse>;
