import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { AttachmentServiceStart } from '../attachments';
import type { AgentExecutionService } from './types';
import { type AgentExecutionDeps } from './execution_runner';
export interface AgentExecutionServiceDeps extends AgentExecutionDeps {
    elasticsearch: ElasticsearchServiceStart;
    taskManager: TaskManagerStartContract;
    spaces?: SpacesPluginStart;
    attachmentsService: AttachmentServiceStart;
}
export declare const createAgentExecutionService: (deps: AgentExecutionServiceDeps) => AgentExecutionService;
