import type { ToolDefinitionWithSchema } from '@kbn/agent-builder-common';
import type { BuiltinToolFormData } from '../components/tools/form/types/tool_form_types';
/**
 * Transforms a built-in tool definition into its UI form representation.
 * @param tool - The built-in tool definition to transform.
 * @returns The built-in tool form data.
 */
export declare const transformBuiltInToolToFormData: (tool: ToolDefinitionWithSchema) => BuiltinToolFormData;
