import type { WorkflowToolDefinition } from '@kbn/agent-builder-common/tools';
import type { CreateToolPayload, UpdateToolPayload } from '../../../common/http_api/tools';
import type { WorkflowToolFormData } from '../components/tools/form/types/tool_form_types';
export declare const transformWorkflowToolToFormData: (tool: WorkflowToolDefinition) => WorkflowToolFormData;
export declare const transformFormDataToWorkflowTool: (data: WorkflowToolFormData) => WorkflowToolDefinition;
export declare const transformWorkflowFormDataForCreate: (data: WorkflowToolFormData) => CreateToolPayload;
export declare const transformWorkflowFormDataForUpdate: (data: WorkflowToolFormData) => UpdateToolPayload;
