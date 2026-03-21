import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolProvider, ExecutableTool, ScopedRunner } from '@kbn/agent-builder-server';
import type { AgentConfiguration, ToolSelection } from '@kbn/agent-builder-common';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { AttachmentsService, SkillsService } from '@kbn/agent-builder-server/runner';
import type { IFileStore } from '@kbn/agent-builder-server/runner/filestore';
import type { ExperimentalFeatures } from '@kbn/agent-builder-server';
import type { ProcessedConversation } from './prepare_conversation';
export declare const selectTools: ({ conversation, previousDynamicToolIds, filteredSkills, skills, request, toolProvider, agentConfiguration, attachmentsService, filestore, spaceId, runner, experimentalFeatures, }: {
    conversation: ProcessedConversation;
    previousDynamicToolIds: string[];
    filteredSkills: InternalSkillDefinition[];
    skills: SkillsService;
    request: KibanaRequest;
    toolProvider: ToolProvider;
    attachmentsService: AttachmentsService;
    filestore: IFileStore;
    agentConfiguration: AgentConfiguration;
    spaceId: string;
    runner: ScopedRunner;
    experimentalFeatures: ExperimentalFeatures;
}) => Promise<{
    staticTools: ExecutableTool<{}, import("zod/v4/index.cjs").ZodObject<any, import("zod/v4/core/schemas.cjs").$strip>>[];
    dynamicTools: ExecutableTool<{}, import("zod/v4/index.cjs").ZodObject<any, import("zod/v4/core/schemas.cjs").$strip>>[];
}>;
export declare const pickTools: ({ toolProvider, selection, request, }: {
    toolProvider: ToolProvider;
    selection: ToolSelection[];
    request: KibanaRequest;
}) => Promise<ExecutableTool[]>;
