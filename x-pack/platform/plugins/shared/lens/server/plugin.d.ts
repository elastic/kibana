import type { Plugin, CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/server';
import type { PluginStart as DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { PluginStart as DataPluginStart, PluginSetup as DataPluginSetup } from '@kbn/data-plugin/server';
import type { ExpressionsServerSetup } from '@kbn/expressions-plugin/server';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { SharePluginSetup } from '@kbn/share-plugin/server';
import { makeLensEmbeddableFactory } from './embeddable/make_lens_embeddable_factory';
export interface PluginSetupContract {
    taskManager?: TaskManagerSetupContract;
    embeddable: EmbeddableSetup;
    expressions: ExpressionsServerSetup;
    data: DataPluginSetup;
    share?: SharePluginSetup;
    contentManagement: ContentManagementServerSetup;
    usageCollection?: UsageCollectionSetup;
}
export interface PluginStartContract {
    taskManager?: TaskManagerStartContract;
    fieldFormats: FieldFormatsStart;
    data: DataPluginStart;
    dataViews: DataViewsServerPluginStart;
}
export interface LensServerPluginSetup {
    /**
     * Server side embeddable definition which provides migrations to run if Lens state is embedded into another saved object somewhere
     */
    lensEmbeddableFactory: ReturnType<typeof makeLensEmbeddableFactory>;
    /**
     * Register custom migration functions for custom third party Lens visualizations
     */
    registerVisualizationMigration: (id: string, migrationsGetter: () => MigrateFunctionsObject) => void;
}
export declare class LensServerPlugin implements Plugin<LensServerPluginSetup, {}, PluginSetupContract, PluginStartContract> {
    private initializerContext;
    private customVisualizationMigrations;
    private readonly logger;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup<PluginStartContract>, plugins: PluginSetupContract): LensServerPluginSetup;
    start(core: CoreStart, plugins: PluginStartContract): {};
    stop(): void;
}
