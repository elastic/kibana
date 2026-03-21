import type { Logger } from '@kbn/logging';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { ScopedRunner, RunContext, Runner, WritableToolResultStore, ModelProvider, HooksServiceStart } from '@kbn/agent-builder-server';
import type { WritableSkillsStore } from '@kbn/agent-builder-server/runner';
import type { ConversationStateManager, PromptManager, ToolManager } from '@kbn/agent-builder-server/runner';
import type { IFileStore } from '@kbn/agent-builder-server/runner/filestore';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { ToolsServiceStart } from '../tools';
import type { AgentsServiceStart } from '../agents';
import type { AttachmentServiceStart } from '../attachments';
import type { ModelProviderFactoryFn } from './model_provider';
import type { AnalyticsService, TrackingService } from '../../telemetry';
import type { SkillServiceStart } from '../skills';
export interface CreateScopedRunnerDeps {
    elasticsearch: ElasticsearchServiceStart;
    security: SecurityServiceStart;
    savedObjects: SavedObjectsServiceStart;
    uiSettings: UiSettingsServiceStart;
    spaces: SpacesPluginStart | undefined;
    actions: ActionsPluginStart;
    modelProvider: ModelProvider;
    toolsService: ToolsServiceStart;
    agentsService: AgentsServiceStart;
    attachmentsService: AttachmentServiceStart;
    promptManager: PromptManager;
    stateManager: ConversationStateManager;
    trackingService?: TrackingService;
    analyticsService?: AnalyticsService;
    hooks: HooksServiceStart;
    logger: Logger;
    request: KibanaRequest;
    defaultConnectorId?: string;
    /**
     * Optional abort signal for the run (e.g. from the request).
     * Propagated to hooks so they can respect cancellation.
     */
    abortSignal?: AbortSignal;
    resultStore: WritableToolResultStore;
    skillsStore: WritableSkillsStore;
    attachmentStateManager: AttachmentStateManager;
    skillServiceStart: SkillServiceStart;
    toolManager: ToolManager;
    filestore: IFileStore;
}
export type CreateRunnerDeps = Omit<CreateScopedRunnerDeps, 'request' | 'defaultConnectorId' | 'resultStore' | 'skillsStore' | 'attachmentStateManager' | 'modelProvider' | 'promptManager' | 'stateManager' | 'filestore' | 'toolManager'> & {
    modelProviderFactory: ModelProviderFactoryFn;
};
export declare class RunnerManager {
    readonly deps: CreateScopedRunnerDeps;
    readonly context: RunContext;
    constructor(deps: CreateScopedRunnerDeps, context?: RunContext);
    getRunner: () => ScopedRunner;
    createChild(childContext: RunContext): RunnerManager;
}
export declare const createScopedRunner: (deps: CreateScopedRunnerDeps) => ScopedRunner;
export declare const createRunner: (deps: CreateRunnerDeps) => Runner;
