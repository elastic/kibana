import React from 'react';
import type { ReactNode } from 'react';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
type ConversationAction = (typeof AGENT_BUILDER_UI_EBT.action.conversation)[keyof typeof AGENT_BUILDER_UI_EBT.action.conversation];
interface StepLayoutProps {
    label: ReactNode;
    onClick?: () => void;
    isExpanded?: boolean;
    isExpandable?: boolean;
    expansion?: ReactNode;
    ebtAction?: ConversationAction;
}
export declare const StepLayout: React.FC<StepLayoutProps>;
export {};
