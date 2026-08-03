import React from 'react';
import { type AgentAccessControlEntry, type AgentDefinition } from '@kbn/agent-builder-common';
interface AccessFormProps {
    agent: Pick<AgentDefinition, 'access_control'>;
    entries: AgentAccessControlEntry[];
    ownerName?: string;
    isDisabled?: boolean;
    onChange: (entries: AgentAccessControlEntry[]) => void;
}
export declare const AccessForm: React.FC<AccessFormProps>;
export {};
