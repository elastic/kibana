import { ToolType } from '@kbn/agent-builder-common';
import type { CreateToolPayload, UpdateToolPayload } from '../../../../../../common/http_api/tools';
import type { ToolFormData } from '../types/tool_form_types';
export declare const TOOLS_FORM_REGISTRY: {
    esql: import("./common").ToolTypeRegistryEntry<import("../types/tool_form_types").EsqlToolFormData>;
    index_search: import("./common").ToolTypeRegistryEntry<import("../types/tool_form_types").IndexSearchToolFormData>;
    workflow: import("./common").ToolTypeRegistryEntry<import("../types/tool_form_types").WorkflowToolFormData>;
    builtin: import("./common").ToolTypeRegistryEntry<import("../types/tool_form_types").BuiltinToolFormData>;
    mcp: import("./common").ToolTypeRegistryEntry<import("../types/tool_form_types").McpToolFormData>;
};
export declare function getToolTypeConfig<T extends ToolType>(toolType: T): (typeof TOOLS_FORM_REGISTRY)[T];
export declare function getCreatePayloadFromData<T extends ToolFormData>(data: T): CreateToolPayload;
export declare function getUpdatePayloadFromData<T extends ToolFormData>(data: T): UpdateToolPayload;
export declare function getEditableToolTypes(): Array<{
    value: ToolType;
    text: string;
}>;
export declare function getToolTypeDefaultValues(toolType: ToolType): ToolFormData;
