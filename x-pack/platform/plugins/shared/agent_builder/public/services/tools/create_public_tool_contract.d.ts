import type { ToolServiceStartContract } from '@kbn/agent-builder-browser';
import type { ToolsService } from './tools_service';
export declare const createPublicToolContract: ({ toolsService, }: {
    toolsService: ToolsService;
}) => ToolServiceStartContract;
