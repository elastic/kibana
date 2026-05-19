import type { CoreSetup, ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { ConcreteTaskInstance, TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { LoggerFactory } from '@kbn/core/server';
import type { AgentPolicy } from '../../common/types';
export declare const TYPE = "fleet:automatic-agent-upgrade-task";
export declare const VERSION = "1.0.3";
interface AutomaticAgentUpgradeTaskConfig {
    taskInterval?: string;
    retryDelays?: string[];
}
interface AutomaticAgentUpgradeTaskSetupContract {
    core: CoreSetup;
    taskManager: TaskManagerSetupContract;
    logFactory: LoggerFactory;
    config: AutomaticAgentUpgradeTaskConfig;
}
interface AutomaticAgentUpgradeTaskStartContract {
    taskManager: TaskManagerStartContract;
}
interface UpgradeTargetForVersion {
    version: string;
    count: number;
    targetPercentage: number;
    alreadyUpgrading: number;
}
export declare class AutomaticAgentUpgradeTask {
    private logger;
    private wasStarted;
    private taskInterval;
    private retryDelays;
    constructor(setupContract: AutomaticAgentUpgradeTaskSetupContract);
    start: ({ taskManager }: AutomaticAgentUpgradeTaskStartContract) => Promise<void>;
    private get taskId();
    runTask: (taskInstance: ConcreteTaskInstance, core: CoreSetup, abortController: AbortController) => Promise<{
        state: {};
        shouldDeleteTask: boolean;
    } | undefined>;
    private endRun;
    private checkAgentPoliciesForAutomaticUpgrades;
    private checkAgentPolicyForAutomaticUpgrades;
    getVersionAndCounts(agentPolicy: AgentPolicy, totalActiveAgents: number, esClient: ElasticsearchClient, soClient: SavedObjectsClientContract): Promise<UpgradeTargetForVersion[]>;
    adjustAgentCounts(versionAndCounts: UpgradeTargetForVersion[], totalActiveAgents: number): Promise<UpgradeTargetForVersion[]>;
    private getAgentCount;
    private updatingQuery;
    private processRequiredVersion;
    private processRetries;
    private isAgentReadyForRetry;
    private getNextAgentsBatch;
    private findAndUpgradeCandidateAgents;
    private isAgentEligibleForUpgrade;
    private getUpgradeDurationSeconds;
}
export {};
