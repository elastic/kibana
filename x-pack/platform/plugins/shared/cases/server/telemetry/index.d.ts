import type { CoreSetup, Logger, PluginInitializerContext } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { ConfigType } from '../config';
export { scheduleCasesTelemetryTask } from './schedule_telemetry_task';
interface CreateCasesTelemetryArgs {
    core: CoreSetup;
    taskManager: TaskManagerSetupContract;
    usageCollection: UsageCollectionSetup;
    logger: Logger;
    kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
    templatesConfig?: ConfigType['templates'];
}
export declare const createCasesTelemetry: ({ core, taskManager, usageCollection, logger, templatesConfig, }: CreateCasesTelemetryArgs) => void;
