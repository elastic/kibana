import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AnyToolTypeDefinition } from './definitions';
export declare const getToolTypeDefinitions: ({ workflowsManagement, actions, }: {
    workflowsManagement?: WorkflowsServerPluginSetup;
    actions: ActionsPluginStart;
}) => AnyToolTypeDefinition[];
