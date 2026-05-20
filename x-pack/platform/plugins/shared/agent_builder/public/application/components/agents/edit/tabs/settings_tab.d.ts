import React from 'react';
import { type UserIdAndName } from '@kbn/agent-builder-common';
import type { Control, FormState } from 'react-hook-form';
import type { AgentFormData } from '../agent_form';
interface AgentSettingsTabProps {
    control: Control<AgentFormData>;
    formState: FormState<AgentFormData>;
    isCreateMode: boolean;
    isFormDisabled: boolean;
    owner?: UserIdAndName;
    agentId?: string;
}
export declare const AgentSettingsTab: React.FC<AgentSettingsTabProps>;
export {};
