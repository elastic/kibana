import type { KibanaRequest } from '@kbn/core-http-server';
import type { SkillsService, ExecutableTool } from '@kbn/agent-builder-server/runner';
import type { Runner } from '@kbn/agent-builder-server';
import type { SkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { SkillServiceStart } from '../../skills';
import type { AnyToolTypeDefinition } from '../../tools/tool_types';
import type { ToolsServiceStart } from '../../tools';
export declare const createSkillsService: ({ skillServiceStart, toolsServiceStart, runner, request, spaceId, }: {
    skillServiceStart: SkillServiceStart;
    toolsServiceStart: ToolsServiceStart;
    runner: Runner;
    request: KibanaRequest;
    spaceId: string;
}) => Promise<SkillsService>;
type SkillToolConverterFn = (tool: SkillBoundedTool) => ExecutableTool;
export declare const createSkillToolConverter: ({ request, spaceId, definitions, runner, }: {
    request: KibanaRequest;
    spaceId: string;
    definitions: AnyToolTypeDefinition[];
    runner: Runner;
}) => SkillToolConverterFn;
export {};
