import React from 'react';
import type { ToolDefinition } from '@kbn/agent-builder-common';
import type { Control } from 'react-hook-form';
import type { AgentFormData } from '../agent_form';
interface ToolsTabProps {
    control: Control<AgentFormData>;
    tools: ToolDefinition[];
    isLoading: boolean;
    isFormDisabled: boolean;
    areElasticCapabilitiesEnabled: boolean;
}
export declare const ToolsTab: React.FC<ToolsTabProps>;
export {};
