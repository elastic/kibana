import type { CoreSetup } from '@kbn/core/server';
import type { ConcreteTaskInstance, TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { LoggerFactory } from '@kbn/core/server';
export declare const TYPE = "fleet:version-specific-policy-assignment-task";
export declare const VERSION = "1.0.0";
interface VersionSpecificPolicyAssignmentTaskConfig {
    taskInterval?: string;
}
interface VersionSpecificPolicyAssignmentTaskSetupContract {
    core: CoreSetup;
    taskManager: TaskManagerSetupContract;
    logFactory: LoggerFactory;
    config: VersionSpecificPolicyAssignmentTaskConfig;
}
interface VersionSpecificPolicyAssignmentTaskStartContract {
    taskManager: TaskManagerStartContract;
}
export declare class VersionSpecificPolicyAssignmentTask {
    private logger;
    private wasStarted;
    private taskInterval;
    constructor(setupContract: VersionSpecificPolicyAssignmentTaskSetupContract);
    start: ({ taskManager }: VersionSpecificPolicyAssignmentTaskStartContract) => Promise<void>;
    private get taskId();
    runTask: (taskInstance: ConcreteTaskInstance, core: CoreSetup, abortController: AbortController) => Promise<{
        state: {};
        shouldDeleteTask: boolean;
    } | undefined>;
    private endRun;
    /**
     * Fetches all agent policies with has_agent_version_conditions flag and processes them
     */
    private processAgentPoliciesWithVersionConditions;
    /**
     * Process a single agent policy to find and reassign agents to version-specific policies
     */
    private processAgentPolicyForVersionAssignment;
    /**
     * Find agents that need to be assigned/reassigned to version-specific policies
     *
     * Criteria:
     * 1. Agents on parent policy (newly enrolled) that need versioned policy
     * 2. Agents on versioned policy but upgraded to a different version (recently upgraded)
     *
     * Note: Agents already on the correct versioned policy but with outdated revisions
     * do NOT need reassignment - they will receive policy updates automatically through
     * fleet-server after deployPolicies updates .fleet-policies.
     */
    private findAgentsNeedingVersionSpecificPolicies;
    /**
     * Extract minor version from a full version string (e.g., "9.2.1" -> "9.2")
     */
    private extractMinorVersion;
    /**
     * Create version-specific policies and reassign agents to them
     */
    private createVersionPoliciesAndReassignAgents;
    /**
     * Reassign agents in a version group to their target versioned policy
     */
    private reassignAgentsToVersionedPolicy;
}
export {};
