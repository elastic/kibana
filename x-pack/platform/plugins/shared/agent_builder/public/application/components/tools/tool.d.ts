import type { ToolDefinitionWithSchema } from '@kbn/agent-builder-common';
import React from 'react';
import type { CreateToolPayload, CreateToolResponse, UpdateToolPayload, UpdateToolResponse } from '../../../../common/http_api/tools';
import { ToolFormMode } from './form/tool_form';
interface ToolBaseProps {
    tool?: ToolDefinitionWithSchema;
    isLoading: boolean;
}
interface ToolCreateProps extends ToolBaseProps {
    mode: ToolFormMode.Create;
    isSubmitting: boolean;
    saveTool: (data: CreateToolPayload) => Promise<CreateToolResponse>;
}
interface ToolEditProps extends ToolBaseProps {
    mode: ToolFormMode.Edit;
    isSubmitting: boolean;
    saveTool: (data: UpdateToolPayload) => Promise<UpdateToolResponse>;
}
interface ToolViewProps extends ToolBaseProps {
    mode: ToolFormMode.View;
    isSubmitting?: never;
    saveTool?: never;
}
export type ToolProps = ToolCreateProps | ToolEditProps | ToolViewProps;
export declare const Tool: React.FC<ToolProps>;
export {};
