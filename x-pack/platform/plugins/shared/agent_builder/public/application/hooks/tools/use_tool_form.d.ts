import type { ToolDefinitionWithSchema } from '@kbn/agent-builder-common';
import { ToolType } from '@kbn/agent-builder-common';
import type { ToolFormData } from '../../components/tools/form/types/tool_form_types';
export declare const useToolForm: (tool?: ToolDefinitionWithSchema, selectedToolType?: ToolType) => import("react-hook-form").UseFormReturn<ToolFormData, any, undefined>;
