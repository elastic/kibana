import type { ElasticsearchServiceStart, Logger, UiSettingsServiceStart, SavedObjectsServiceStart } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { Runner } from '@kbn/agent-builder-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { ToolsServiceSetup, ToolsServiceStart } from './types';
export interface ToolsServiceSetupDeps {
    logger: Logger;
    workflowsManagement?: WorkflowsServerPluginSetup;
}
export interface ToolsServiceStartDeps {
    getRunner: () => Runner;
    elasticsearch: ElasticsearchServiceStart;
    spaces?: SpacesPluginStart;
    uiSettings: UiSettingsServiceStart;
    savedObjects: SavedObjectsServiceStart;
    actions: ActionsPluginStart;
}
export declare class ToolsService {
    private setupDeps?;
    private builtinRegistry;
    constructor();
    setup(deps: ToolsServiceSetupDeps): ToolsServiceSetup;
    start({ getRunner, elasticsearch, spaces, uiSettings, savedObjects, actions, }: ToolsServiceStartDeps): ToolsServiceStart;
}
