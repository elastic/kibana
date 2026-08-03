import React from 'react';
import type { InlineWorkflowActionDraft } from '../types';
interface SlackChannelSelectorProps {
    connectorId: string | null;
    params: string;
    onParamsChange: (params: string) => void;
}
export declare const SlackChannelSelector: ({ connectorId, params, onParamsChange, }: SlackChannelSelectorProps) => React.JSX.Element;
export declare const SlackChannelSelectorWrapper: ({ value, onChange, }: {
    value: InlineWorkflowActionDraft;
    onChange: (value: InlineWorkflowActionDraft) => void;
}) => React.JSX.Element;
export {};
