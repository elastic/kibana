import { StructuredTool } from "@langchain/core/tools";
import { LRUMap } from "./lru_map";
import { createToolIdMappings, toolToLangchain } from "@kbn/agent-builder-genai-utils/langchain";
import { reverseMap } from "@kbn/agent-builder-genai-utils/langchain/tools";
import { browserToolsToLangchain } from "../tools/browser_tool_adapter";
import {
    ToolManager as IToolManager,
    ToolManagerParams,
    ToolName,
    AddToolOptions,
    AddToolInput
} from "@kbn/agent-builder-server/runner/tool_manager";

export const createToolManager = (): ToolManager => {
    return new ToolManager({
        dynamicToolCapacity: 10,
    })
}

/**
 * ToolManager is a class that manages tools for the agent.
 * It stores static tools and dynamic tools. Static tools do not change through out a round while dynamic tools can be added and removed.
 * 
 * Dynamic tools are limited to a certain capacity to prevent too many tools from being added to the agent.
 * Least recently used tools are evicted when the capacity is reached.
 */
export class ToolManager implements IToolManager {
    private staticTools: Map<ToolName, StructuredTool> = new Map<ToolName, StructuredTool>();
    private dynamicTools: LRUMap<ToolName, StructuredTool>
    private toolIdMappings: Map<string, string>;

    constructor(params: ToolManagerParams) {
        this.dynamicTools = new LRUMap<ToolName, StructuredTool>(params.dynamicToolCapacity);
        this.toolIdMappings = new Map<string, string>();
    }

    public async addTool(input: AddToolInput, options: AddToolOptions = {}): Promise<void> {
        const { dynamic = false } = options;

        let langchainTools: StructuredTool[];
        let idMappings: Map<string, string>;

        if (input.type === 'executable') {
            const tools = Array.isArray(input.tools) ? input.tools : [input.tools];
            const toolIdMapping = createToolIdMappings(tools);

            langchainTools = await Promise.all(tools.map(tool => toolToLangchain({
                tool,
                logger: input.logger,
                sendEvent: input.eventEmitter,
                toolId: toolIdMapping.get(tool.id),
            })));

            idMappings = reverseMap(toolIdMapping);
        } else {
            const browserApiTools = Array.isArray(input.tools) ? input.tools : [input.tools];
            const browserLangchainTools = browserToolsToLangchain({ browserApiTools });
            
            langchainTools = browserLangchainTools.tools;
            idMappings = browserLangchainTools.idMappings;
        }

        this.toolIdMappings = new Map([...this.toolIdMappings, ...idMappings]);

        langchainTools.forEach(langchainTool => {
            const { name } = langchainTool;
            // TODO: Check if tool already exists in the store
            if (dynamic) {
                this.dynamicTools.set(name, langchainTool);
            } else {
                this.staticTools.set(name, langchainTool);
            }
        });
    }

    public list(): StructuredTool[] {
        return Array.from(this.staticTools.values()).concat(this.dynamicTools.values());
    }

    public recordToolUse(name: ToolName): void {
        if (this.dynamicTools.has(name)) {
            this.dynamicTools.get(name);
        }
    }

    public getToolIdMapping(): Map<string, string> {
        return this.toolIdMappings;
    }

    public getDynamicToolIds(): string[] {
        const internalToolIds: string[] = [];
        for (const tool of this.dynamicTools.values()) {
            const langchainName = tool.name;
            const internalId = this.toolIdMappings.get(langchainName);
            if (internalId) {
                internalToolIds.push(internalId);
            }
        }

        return internalToolIds;
    }
}

export type { ToolManagerParams };