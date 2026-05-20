import React from 'react';
import type { Agent, AgentPolicy } from '../../../../types';
export declare const AgentDetailsActionMenu: React.FunctionComponent<{
    agent: Agent;
    agentPolicy?: AgentPolicy;
    assignFlyoutOpenByDefault?: boolean;
    onCancelReassign?: () => void;
    onAddRemoveTagsClick: (button: HTMLElement) => void;
}>;
