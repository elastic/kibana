import React from 'react';
import type { PluginDefinition } from '@kbn/agent-builder-common';
import type { Control } from 'react-hook-form';
import type { AgentFormData } from '../agent_form';
interface PluginsTabProps {
    control: Control<AgentFormData>;
    plugins: PluginDefinition[];
    isLoading: boolean;
    isFormDisabled: boolean;
    areElasticCapabilitiesEnabled: boolean;
}
export declare const PluginsTab: React.FC<PluginsTabProps>;
export {};
