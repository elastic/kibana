import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { ActionsUsage } from './types';
import type { ActionsConfig } from '../config';
export declare function createActionsUsageCollector(usageCollection: UsageCollectionSetup, config: ActionsConfig, taskManager: Promise<TaskManagerStartContract>): import("@kbn/usage-collection-plugin/server").Collector<ActionsUsage, {}>;
export declare function registerActionsUsageCollector(usageCollection: UsageCollectionSetup, config: ActionsConfig, taskManager: Promise<TaskManagerStartContract>): void;
