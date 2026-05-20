import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
export declare function registerReassignAgentsToVersionSpecificPoliciesTask(taskManagerSetup: TaskManagerSetupContract): void;
export declare function scheduleReassignAgentsToVersionSpecificPoliciesTask(taskManagerStart: TaskManagerStartContract, versionSpecificAgentPolicyIds: string[]): Promise<void>;
export declare function reassignAgentsToVersionSpecificPolicies(versionedAgentPolicyId: string): Promise<void>;
