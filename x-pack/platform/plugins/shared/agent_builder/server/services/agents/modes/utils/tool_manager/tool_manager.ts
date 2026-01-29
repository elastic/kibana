import { StructuredTool } from "@langchain/core/tools";
import { LRUMap } from "./lru_map";
import { BrowserApiToolMetadata } from "@kbn/agent-builder-common";
import { AgentEventEmitterFn, ExecutableTool } from "@kbn/agent-builder-server";
import { KibanaRequest } from "@kbn/core-http-server";
import { createToolIdMappings, toolsToLangchain, toolToLangchain } from "@kbn/agent-builder-genai-utils/langchain";
import { Logger } from "@kbn/logging";
import { browserToolsToLangchain } from "../../../../tools/browser_tool_adapter";
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

type ExecutableAndBrowserTools = {
    browserApiTools?: BrowserApiToolMetadata[];
    executableTools?: ExecutableTool[];
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
        ToolManager.validateTools([...staticTools, ...initialDynamicTools]);

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

    /**
     * Ensures that there are no duplicate tool names in the provided tools.
     * @param tools 
     */
    private static validateTools(tools: StructuredTool[]) {
        const toolNames = new Set<string>();
        for (const tool of tools) {
            if (toolNames.has(tool.name)) {
                throw new Error(`Duplicate tool name found: ${tool.name}`);
            }
            toolNames.add(tool.name);
        }
    }

    /**
     * Lists all tools in the tool manager.
     * @returns an array of tools
     */
    public list() {
        return Array.from(this.staticTools.values()).concat(this.dynamicTools.values());
    }

    /**
     * Adds one or more tools to the tool manager. If the tool already exists, it will be replaced.
     * If capacity is reached, the least recently used dynamic tools will be removed.
     * @param tool - the tool / tools to add
     * @returns Promise
     */
    public async addTool(dynamicTool: ExecutableTool | ExecutableTool[]): Promise<void> {
        const tools = Array.isArray(dynamicTool) ? dynamicTool : [dynamicTool];
        const toolIdMapping = createToolIdMappings(tools);

        const langchainTools = await Promise.all(tools.map(tool => toolToLangchain({
            tool,
            logger: this.logger,
            sendEvent: this.eventEmitter,
            toolId: toolIdMapping.get(tool.id),
        })));

        const reverseToolIdMapping = reverseMap(toolIdMapping);

        this.toolIdMappings = new Map([...this.toolIdMappings, ...reverseToolIdMapping]);

        langchainTools.forEach(langchainTool => {
            const { name } = langchainTool;
            // if tool is already in static tools, don't add it to dynamic tools
            if (this.staticTools.has(name)) {
                return;
            }
            this.dynamicTools.set(name, langchainTool);
        });
    }

    /**
     * Records the use of a tool, marking it as recently used.
     * @param name - the name of the tool to get
     * @returns void
     */
    public recordToolUse(name: ToolName) {
        if (this.dynamicTools.has(name)) {
            this.dynamicTools.get(name);
        }
    }

    /**
     * Gets the tool id mapping.
     * @returns the tool id mapping
     */
    public getToolIdMapping() {
        return this.toolIdMappings;
    }

    /**
     * Gets the internal tool IDs of all dynamic tools currently in the tool manager.
     * Returns internal tool IDs (not LangChain names) for persistence.
     * @returns array of internal tool IDs
     */
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

    public static builder() {
        return new ToolManager.Builder()
    }

    static Builder = class ToolManagerBuilder {
        private staticTools: ExecutableAndBrowserTools = {};
        private dynamicTools: ExecutableAndBrowserTools = {}

        public withStaticTools(staticTools: ExecutableAndBrowserTools) {
            this.staticTools = {
                browserApiTools: [...this.staticTools.browserApiTools ?? [], ...staticTools?.browserApiTools ?? []],
                executableTools: [...this.staticTools.executableTools ?? [], ...staticTools?.executableTools ?? []],
            };
            return this;
        }

        public withDynamicTools(dynamicTools: ExecutableAndBrowserTools) {
            this.dynamicTools = {
                browserApiTools: [...this.dynamicTools.browserApiTools ?? [], ...dynamicTools?.browserApiTools ?? []],
                executableTools: [...this.dynamicTools.executableTools ?? [], ...dynamicTools?.executableTools ?? []],
            };
            return this;
        }

        private async convertToLangchainTools(params: {
            tools: ExecutableAndBrowserTools
            logger: Logger;
            request: KibanaRequest;
            eventEmitter?: AgentEventEmitterFn;
        }) {
            const { tools } = params

            const executableLangchainTools = toolsToLangchain({
                tools: tools.executableTools ?? [],
                logger: params.logger,
                request: params.request,
                sendEvent: params.eventEmitter,
            });

            const browserLangchainTools = browserToolsToLangchain({
                browserApiTools: tools.browserApiTools ?? [],
            });

            const [convertedExecutableTools, convertedBrowserTools] = await Promise.all([executableLangchainTools, browserLangchainTools]);

            return {
                tools: [
                    ...convertedExecutableTools.tools,
                    ...convertedBrowserTools.tools
                ],
                idMappings: new Map<string, string>([
                    ...convertedExecutableTools.idMappings,
                    ...convertedBrowserTools.idMappings
                ])
            };
        }


        public async build(params: {
            dynamicToolCapacity: number;
            request: KibanaRequest;
            logger: Logger;
            eventEmitter?: AgentEventEmitterFn;
        }) {

            const staticLangchainTools = this.convertToLangchainTools({
                tools: this.staticTools,
                logger: params.logger,
                request: params.request,
                eventEmitter: params.eventEmitter,
            });

            const initialDynamicLangchainTools = this.convertToLangchainTools({
                tools: this.dynamicTools,
                logger: params.logger,
                request: params.request,
                eventEmitter: params.eventEmitter,
            });

            const [staticTools, initialDynamicTools] = await Promise.all([staticLangchainTools, initialDynamicLangchainTools]);

            return new ToolManager({
                staticTools: staticTools.tools,
                initialDynamicTools: initialDynamicTools.tools,
                dynamicToolCapacity: params.dynamicToolCapacity,
                toolIdMappings: new Map<string, string>([
                    ...staticTools.idMappings,
                    ...initialDynamicTools.idMappings
                ]),
                logger: params.logger,
                eventEmitter: params.eventEmitter,
            })
        }
    }
}

export type { ToolManagerParams };
