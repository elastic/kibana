import type { Resolver } from 'react-hook-form';
import type { ToolDefinitionWithSchema } from '@kbn/agent-builder-common';
import type { AgentBuilderInternalService } from '../../../../../services/types';
import type { CreateToolPayload, UpdateToolPayload } from '../../../../../../common/http_api/tools';
import type { ToolFormData } from '../types/tool_form_types';
import type { ToolFormMode } from '../tool_form';
export declare const commonToolFormDefaultValues: {
    toolId: string;
    description: string;
    labels: never[];
};
interface ConfigurationComponentProps {
    mode: ToolFormMode;
}
export interface ToolTypeRegistryEntry<TFormData extends ToolFormData = ToolFormData> {
    label: string;
    getConfigurationComponent: () => React.ComponentType<ConfigurationComponentProps>;
    defaultValues: TFormData;
    toolToFormData: (tool: ToolDefinitionWithSchema) => TFormData;
    formDataToCreatePayload: (data: TFormData) => CreateToolPayload;
    formDataToUpdatePayload: (data: TFormData) => UpdateToolPayload;
    getValidationResolver: (services?: AgentBuilderInternalService) => Resolver<TFormData>;
}
export {};
