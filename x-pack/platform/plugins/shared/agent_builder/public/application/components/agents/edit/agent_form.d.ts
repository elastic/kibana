import { type AgentDefinition } from '@kbn/agent-builder-common';
import React from 'react';
interface EditingAgentFormProps {
    editingAgentId: string;
    onDelete: () => void;
}
interface CreateAgentFormProps {
    editingAgentId?: never;
    onDelete?: never;
}
type AgentFormProps = EditingAgentFormProps | CreateAgentFormProps;
export type AgentFormData = Omit<AgentDefinition, 'type' | 'readonly'>;
export declare const AgentForm: React.FC<AgentFormProps>;
export {};
