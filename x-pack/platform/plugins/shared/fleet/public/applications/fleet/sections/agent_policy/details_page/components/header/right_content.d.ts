import React from 'react';
import type { AgentPolicy } from '../../../../../types';
export interface HeaderRightContentProps {
    isLoading: boolean;
    agentPolicy?: AgentPolicy | null;
    addAgent: () => void;
    onCancelEnrollment?: () => void;
    isAddAgentHelpPopoverOpen: boolean;
    setIsAddAgentHelpPopoverOpen: (state: boolean) => void;
}
export declare const HeaderRightContent: React.FunctionComponent<HeaderRightContentProps>;
