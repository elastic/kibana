import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
export declare function registerDeployAgentPoliciesTask(taskManagerSetup: TaskManagerSetupContract): void;
export declare function scheduleDeployAgentPoliciesTask(taskManagerStart: TaskManagerStartContract, agentPolicyIdsWithSpace: Array<{
    id: string;
    spaceId?: string;
}>): Promise<void>;
