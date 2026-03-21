import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { Logger } from '@kbn/logging';
import type { SmlService } from './types';
/**
 * Security model:
 *
 * The SML crawler runs as a Task Manager background task with internal
 * credentials (`asInternalUser` / `createInternalRepository`). This is the
 * standard Kibana pattern for background tasks that have no user context.
 *
 * The crawler indexes ALL content across ALL spaces into the SML system index.
 * Access control is enforced at **query time**, not index time:
 *
 *  1. `searchSml` filters results to the requesting user's current space.
 *  2. `filterResultsByPermissions` batch-checks the user's Kibana privileges
 *     against each result's `permissions` array.
 *  3. `checkItemsAccess` (used by `sml_attach`) performs the same privilege
 *     check before allowing attachment resolution.
 *
 * When the security plugin is absent (development/testing), all results are
 * returned unfiltered, following the standard Kibana open-access convention.
 *
 * SML type implementers are responsible for setting correct `permissions`
 * arrays in their `getSmlData` hook (see `SmlTypeDefinition`).
 */
export declare const SML_CRAWLER_TASK_TYPE = "agent_builder:sml_crawler";
export interface SmlCrawlerTaskParams {
    attachmentType: string;
}
export interface SmlCrawlerDepsProvider {
    smlService: SmlService;
    elasticsearch: ElasticsearchServiceStart;
    savedObjects: SavedObjectsServiceStart;
    uiSettings: UiSettingsServiceStart;
    logger: Logger;
}
/**
 * Register the SML crawler task type with task manager.
 * Must be called during plugin setup.
 */
export declare const registerSmlCrawlerTaskDefinition: ({ taskManager, getCrawlerDeps, }: {
    taskManager: TaskManagerSetupContract;
    getCrawlerDeps: () => Promise<SmlCrawlerDepsProvider> | SmlCrawlerDepsProvider;
}) => void;
/**
 * Schedule SML crawler tasks for all registered types that provide a `list` hook.
 * Should be called during plugin start.
 */
export declare const scheduleSmlCrawlerTasks: ({ taskManager, smlService, logger, }: {
    taskManager: TaskManagerStartContract;
    smlService: SmlService;
    logger: Logger;
}) => Promise<void>;
