import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
export declare const validateWorkflowId: ({ workflows, workflowId, spaceId, }: {
    workflows: WorkflowsServerPluginSetup;
    workflowId: string;
    spaceId: string;
}) => Promise<void>;
