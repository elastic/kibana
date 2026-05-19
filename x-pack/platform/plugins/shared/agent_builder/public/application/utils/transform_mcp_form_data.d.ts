import { type McpToolDefinition } from '@kbn/agent-builder-common/tools';
import type { CreateToolPayload, UpdateToolPayload } from '../../../common/http_api/tools';
import type { McpToolFormData } from '../components/tools/form/types/tool_form_types';
export declare const transformMcpToolToFormData: (tool: McpToolDefinition) => McpToolFormData;
export declare const transformFormDataToMcpTool: (data: McpToolFormData) => McpToolDefinition;
export declare const transformMcpFormDataForCreate: (data: McpToolFormData) => CreateToolPayload;
export declare const transformMcpFormDataForUpdate: (data: McpToolFormData) => UpdateToolPayload;
