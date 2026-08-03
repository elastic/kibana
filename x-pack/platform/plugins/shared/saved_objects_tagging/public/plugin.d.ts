import type { CoreSetup, CoreStart, PluginInitializerContext, Plugin } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { SavedObjectTaggingOssPluginSetup } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { SavedObjectTaggingPluginStart } from './types';
import { TagsClient, TagsCache } from './services';
interface SetupDeps {
    management: ManagementSetup;
    savedObjectsTaggingOss: SavedObjectTaggingOssPluginSetup;
}
export declare class SavedObjectTaggingPlugin implements Plugin<{}, SavedObjectTaggingPluginStart, SetupDeps, {}> {
    private tagClient?;
    private tagCache?;
    private assignmentService?;
    private readonly config;
    constructor(context: PluginInitializerContext);
    setup(core: CoreSetup<{}, SavedObjectTaggingPluginStart>, { management, savedObjectsTaggingOss }: SetupDeps): {};
    start({ http, application, analytics, ...startServices }: CoreStart): {
        client: TagsClient;
        cache: TagsCache;
        ui: import("@kbn/saved-objects-tagging-oss-plugin/public").SavedObjectsTaggingApiUi;
    };
    stop(): void;
}
export {};
