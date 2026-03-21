import type { Logger } from '@kbn/logging';
import type { SecurityServiceStart, ElasticsearchServiceStart, UiSettingsServiceStart, SavedObjectsServiceStart } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { AgentsServiceSetup, AgentsServiceStart } from './types';
import type { ToolsServiceStart } from '../tools';
export interface AgentsServiceSetupDeps {
    logger: Logger;
}
export interface AgentsServiceStartDeps {
    security: SecurityServiceStart;
    spaces?: SpacesPluginStart;
    elasticsearch: ElasticsearchServiceStart;
    uiSettings: UiSettingsServiceStart;
    savedObjects: SavedObjectsServiceStart;
    toolsService: ToolsServiceStart;
}
export declare class AgentsService {
    private builtinRegistry;
    private setupDeps?;
    constructor();
    setup(setupDeps: AgentsServiceSetupDeps): AgentsServiceSetup;
    start(startDeps: AgentsServiceStartDeps): AgentsServiceStart;
}
