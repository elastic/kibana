import type { EsqlToolDefinition } from '@kbn/agent-builder-common';
import type { CreateToolPayload, UpdateToolPayload } from '../../../common/http_api/tools';
import { type EsqlToolFormData } from '../components/tools/form/types/tool_form_types';
/**
 * Transforms an ES|QL tool into its UI form representation.
 * @param tool - The ES|QL tool to transform.
 * @returns The ES|QL tool form data.
 */
export declare const transformEsqlToolToFormData: (tool: EsqlToolDefinition) => EsqlToolFormData;
/**
 * Transforms ES|QL tool form data into a `ToolDefinition` entity.
 * @param data - The ES|QL form data to transform.
 * @returns The transformed data as an ES|QL tool.
 */
export declare const transformFormDataToEsqlTool: (data: EsqlToolFormData) => EsqlToolDefinition;
/**
 * Transforms ES|QL form data into a payload for the create tools API.
 * @param data - The ES|QL form data to transform.
 * @returns The payload for the create tools API.
 */
export declare const transformEsqlFormDataForCreate: (data: EsqlToolFormData) => CreateToolPayload;
/**
 * Transforms ES|QL tool form data into a payload for the update tool API.
 * @param data - The ES|QL form data to transform.
 * @returns The payload for the update tool API.
 */
export declare const transformEsqlFormDataForUpdate: (data: EsqlToolFormData) => UpdateToolPayload;
