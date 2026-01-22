import { StructuredTool } from "@langchain/core/tools";
import { LRUMap } from "./lru_map";

type ToolManagerParams = {
    staticTools?: StructuredTool[];
    initialDynamicTools?: StructuredTool[];
    capacity: number;
}

type ToolName = string;

export class ToolManager {
    protected staticTools: Map<ToolName, StructuredTool>;
    protected dynamicTools: LRUMap<ToolName, StructuredTool>

    private constructor(params: ToolManagerParams) {
        const { staticTools = [], initialDynamicTools = [] } = params;
        this.staticTools = new Map(staticTools.map(tool => [tool.name, tool]));
        this.dynamicTools = new LRUMap<string, StructuredTool>(params.capacity);
        initialDynamicTools.forEach(tool => {
            // if tool is already in static tools, don't add it to dynamic tools
            if (this.staticTools.has(tool.name)) {
                return;
            }
            this.dynamicTools.set(tool.name, tool);
        });
    }

    public static from(params: ToolManagerParams) {
        return new ToolManager({
            staticTools: params.staticTools,
            initialDynamicTools: params.initialDynamicTools,
            capacity: params.capacity,
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
    public addTool(tool: StructuredTool): boolean {
        const { name } = tool;
        if (this.staticTools.has(name)) {
            return false
        }

        this.dynamicTools.set(name, tool);
        return true;
    }

    /**
     * Gets a tool from the tool manager. Also marks the tool as used by moving it to the head of the LRUMap.
     * @param name - the name of the tool to get
     * @returns the tool
     */
    public getTool(name: ToolName) {
        console.log("tool manager list");
        console.log(Array.from(this.dynamicTools.values()).map(tool => tool.name));
        if (this.dynamicTools.has(name)) {
            return this.dynamicTools.get(name);
        }

        return this.staticTools.get(name);
    }
}