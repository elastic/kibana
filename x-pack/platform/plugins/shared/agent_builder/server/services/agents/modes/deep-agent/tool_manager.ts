import { StructuredTool } from "@langchain/core/tools";
import { LRUMap } from "./lru_map";
import { BrowserApiToolMetadata } from "@kbn/agent-builder-common";
import { AgentEventEmitterFn, ExecutableTool } from "@kbn/agent-builder-server";
import { KibanaRequest } from "@kbn/core-http-server";
import { createToolIdMappings, toolsToLangchain, toolToLangchain } from "@kbn/agent-builder-genai-utils/langchain";
import { Logger } from "@kbn/logging";
import { browserToolsToLangchain } from "../../../tools/browser_tool_adapter";
import { reverseMap } from "@kbn/agent-builder-genai-utils/langchain/tools";

type ToolManagerParams = {
    staticTools: StructuredTool[];
    initialDynamicTools: StructuredTool[];
    toolIdMappings: Map<string, string>;
    dynamicToolCapacity: number;
    logger: Logger;
    eventEmitter?: AgentEventEmitterFn;
}

type ToolName = string;

type FromParams = {
    attachmentBoundTools?: ExecutableTool[];
    versionedAttachmentTools?: ExecutableTool[];
    browserApiTools?: BrowserApiToolMetadata[];
    registryTools?: ExecutableTool[];
    skillsTools?: ExecutableTool[];
    dynamicToolCapacity: number;
    request: KibanaRequest;
    logger: Logger;
    eventEmitter?: AgentEventEmitterFn;
}


/**
 * ToolManager is a class that manages tools for the agent.
 * It stores static tools and dynamic tools. Static tools do not change through out a round while dynamic tools can be added and removed.
 * 
 * Dynamic tools are limited to a certain capacity to prevent too many tools from being added to the agent.
 * Least recently used tools are evicted when the capacity is reached.
 */
export class ToolManager {
    protected staticTools: Map<ToolName, StructuredTool>;
    protected dynamicTools: LRUMap<ToolName, StructuredTool>
    protected toolIdMappings: Map<string, string>;
    protected logger: Logger;
    protected eventEmitter?: AgentEventEmitterFn;

    private constructor(params: ToolManagerParams) {
        const { staticTools, initialDynamicTools, logger, eventEmitter } = params;
        this.logger = logger;
        this.eventEmitter = eventEmitter;
        this.staticTools = new Map(staticTools.map(tool => [tool.name, tool]));
        this.dynamicTools = new LRUMap<string, StructuredTool>(params.dynamicToolCapacity);
        this.toolIdMappings = params.toolIdMappings
        initialDynamicTools.forEach(tool => {
            // if tool is already in static tools, don't add it to dynamic tools
            if (this.staticTools.has(tool.name)) {
                return;
            }
            this.dynamicTools.set(tool.name, tool);
        });
    }

    public static async from(params: FromParams) {

        const staticExecutableToolsPromise = toolsToLangchain({
            tools: [
                ...(params.attachmentBoundTools ?? []),
                ...(params.versionedAttachmentTools ?? []),
                ...(params.registryTools ?? []),
            ],
            logger: params.logger,
            request: params.request,
            sendEvent: params.eventEmitter,
        });

        const staticBrowserToolsPromise = browserToolsToLangchain({
            browserApiTools: params.browserApiTools ?? [],
        });

        const initialDynamicToolsPromise = toolsToLangchain({
            tools: params.skillsTools ?? [],
            logger: params.logger,
            request: params.request,
            sendEvent: params.eventEmitter,
        });

        const [staticExecutableTools, staticBrowserTools, initialDynamicTools] = await Promise.all([
            staticExecutableToolsPromise,
            staticBrowserToolsPromise,
            initialDynamicToolsPromise
        ]);

        return new ToolManager({
            staticTools: [...staticExecutableTools.tools, ...staticBrowserTools.tools],
            initialDynamicTools: [...initialDynamicTools.tools],
            dynamicToolCapacity: params.dynamicToolCapacity,
            toolIdMappings: new Map([
                ...staticExecutableTools.idMappings, 
                ...staticBrowserTools.idMappings, 
                ...initialDynamicTools.idMappings
            ]),
            logger: params.logger,
            eventEmitter: params.eventEmitter,
        });
    }

    /**
     * Lists all tools in the tool manager.
     * @returns an array of tools
     */
    public list() {
        return Array.from(this.staticTools.values()).concat(this.dynamicTools.values());
    }

    /**
     * Adds a tool to the tool manager. If the tool already exists, it will be replaced.
     * If capacity is reached, the least recently used tool will be removed.
     * @param tool - the tool to add
     * @returns true if tool was added, false if tool already exists
     */
    public async addTool(dynamicTool: ExecutableTool): Promise<boolean> {
        const langchainTool = await toolToLangchain({
            tool: dynamicTool,
            logger: this.logger,
            sendEvent: this.eventEmitter,
        });
        
        // Update tool id mappings
        const toolIdMapping = createToolIdMappings([dynamicTool]);
        const reverseToolIdMapping = reverseMap(toolIdMapping);
        reverseToolIdMapping.forEach((value, key) => {
            this.toolIdMappings.set(value, key);
        });

        const { name } = langchainTool;
        if (this.staticTools.has(name)) {
            return false
        }

        this.dynamicTools.set(name, langchainTool);
        return true;
    }

    /**
     * Gets a tool from the tool manager. Also marks dynamicTools as used moving it to the head of the LRUMap.
     * @param name - the name of the tool to get
     * @returns the tool
     */
    public getTool(name: ToolName) {
        if (this.dynamicTools.has(name)) {
            return this.dynamicTools.get(name);
        }

        return this.staticTools.get(name);
    }

    /**
     * Gets the tool id mapping.
     * @returns the tool id mapping
     */
    public getToolIdMapping() {
        return this.toolIdMappings;
    }
}