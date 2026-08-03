import React from 'react';
import type { EuiPopoverProps } from '@elastic/eui';
import type { AgentDefinition } from '@kbn/agent-builder-common';
export interface AgentSelectorDropdownProps {
    agents: AgentDefinition[];
    selectedAgent?: AgentDefinition;
    onAgentChange: (agentId: string) => void;
    anchorPosition?: EuiPopoverProps['anchorPosition'];
    /** Shown in the trigger button when selectedAgent is undefined (e.g. deleted agent) */
    fallbackLabel?: string;
}
export declare const AgentSelectorDropdown: React.FC<AgentSelectorDropdownProps>;
