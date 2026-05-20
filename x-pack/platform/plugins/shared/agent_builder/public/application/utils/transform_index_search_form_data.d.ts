import type { IndexSearchToolDefinition } from '@kbn/agent-builder-common/tools';
import type { CreateToolPayload, UpdateToolPayload } from '../../../common/http_api/tools';
import type { IndexSearchToolFormData } from '../components/tools/form/types/tool_form_types';
export declare const transformIndexSearchToolToFormData: (tool: IndexSearchToolDefinition) => IndexSearchToolFormData;
export declare const transformFormDataToIndexSearchTool: (data: IndexSearchToolFormData) => IndexSearchToolDefinition;
export declare const transformIndexSearchFormDataForCreate: (data: IndexSearchToolFormData) => CreateToolPayload;
export declare const transformIndexSearchFormDataForUpdate: (data: IndexSearchToolFormData) => UpdateToolPayload;
