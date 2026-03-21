import { z } from '@kbn/zod/v4';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { ToolType } from '@kbn/agent-builder-common';
import type { WorkflowToolConfig } from '@kbn/agent-builder-common/tools';
import type { AnyToolTypeDefinition } from '../definitions';
export declare const getWorkflowToolType: ({ workflowsManagement, }: {
    workflowsManagement?: WorkflowsServerPluginSetup;
}) => AnyToolTypeDefinition<ToolType.workflow, WorkflowToolConfig, z.ZodObject<any>>;
