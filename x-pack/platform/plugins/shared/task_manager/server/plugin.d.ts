import type { UsageCollectionSetup, UsageCollectionStart } from '@kbn/usage-collection-plugin/server';
import type { PluginInitializerContext, Plugin, CoreSetup, CoreStart } from '@kbn/core/server';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-shared';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { Middleware } from './lib/middleware';
import type { TaskDefinitionRegistry } from './task_type_dictionary';
import type { TaskStore } from './task_store';
import type { TaskScheduling } from './task_scheduling';
import type { TaskEventLogger } from './task';
import type { ApiKeyInvalidationFn, UiamApiKeyInvalidationFn } from './invalidate_api_keys/invalidate_api_keys_task';
export interface TaskManagerSetupContract {
    /**
     * @deprecated
     */
    index: string;
    addMiddleware: (middleware: Middleware) => void;
    /**
     * Method for allowing consumers to register task definitions into the system.
     * @param taskDefinitions - The Kibana task definitions dictionary
     */
    registerTaskDefinitions: (taskDefinitions: TaskDefinitionRegistry) => void;
    registerCanEncryptedSavedObjects: (canEncrypt: boolean) => void;
    registerTaskEventLogger: (logger: TaskEventLogger) => void;
}
export type TaskManagerStartContract = Pick<TaskScheduling, 'schedule' | 'runSoon' | 'ensureScheduled' | 'bulkUpdateSchedules' | 'bulkEnable' | 'bulkDisable' | 'bulkSchedule' | 'bulkUpdateState'> & Pick<TaskStore, 'fetch' | 'aggregate' | 'get' | 'bulkGet' | 'remove' | 'bulkRemove'> & {
    removeIfExists: TaskStore['remove'];
} & {
    getRegisteredTypes: () => string[];
    registerEncryptedSavedObjectsClient: (client: EncryptedSavedObjectsClient) => void;
    registerApiKeyInvalidateFn: (fn?: ApiKeyInvalidationFn) => void;
    registerUiamApiKeyInvalidateFn: (fn?: UiamApiKeyInvalidationFn) => void;
};
export interface TaskManagerPluginsStart {
    licensing: LicensingPluginStart;
    cloud?: CloudStart;
    usageCollection?: UsageCollectionStart;
}
export interface TaskManagerPluginsSetup {
    cloud?: CloudSetup;
    usageCollection?: UsageCollectionSetup;
}
export declare class TaskManagerPlugin implements Plugin<TaskManagerSetupContract, TaskManagerStartContract, TaskManagerPluginsSetup, TaskManagerPluginsStart> {
    private readonly initContext;
    private taskPollingLifecycle?;
    private taskManagerId?;
    private usageCounter?;
    private config;
    private logger;
    private definitions;
    private middleware;
    private elasticsearchAndSOAvailability$?;
    private monitoringStats$;
    private metrics$;
    private resetMetrics$;
    private shouldRunBackgroundTasks;
    private readonly kibanaVersion;
    private adHocTaskCounter;
    private taskManagerMetricsCollector?;
    private nodeRoles;
    private kibanaDiscoveryService?;
    private heapSizeLimit;
    private numOfKibanaInstances$;
    private canEncryptSavedObjects;
    private licenseSubscriber?;
    private invalidateApiKeyFn?;
    private taskEventLogger?;
    private invalidateUiamApiKeyFn?;
    private taskStore?;
    private startContract?;
    private uiamApiKeyProvisioningTask?;
    constructor(initContext: PluginInitializerContext);
    isNodeBackgroundTasksOnly(): boolean;
    private invalidateApiKey;
    private get invalidateUiamApiKey();
    setup(core: CoreSetup<TaskManagerPluginsStart, TaskManagerStartContract>, plugins: TaskManagerPluginsSetup): TaskManagerSetupContract;
    start(core: CoreStart, { cloud, licensing }: TaskManagerPluginsStart): TaskManagerStartContract;
    stop(): Promise<void>;
}
