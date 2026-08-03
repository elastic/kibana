import React from 'react';
import { type LegacyRuleTypeItem } from './rule_create_options_panel';
export interface RuleCreateOptionsFlyoutProps {
    onClose: () => void;
    onCreateEsqlRule: () => void;
    onCreateWithAgent: () => void;
    /**
     * When `true`, the "Create with AI Agent" option is rendered disabled. Independent of
     * `createWithAgentTooltipText`.
     */
    createWithAgentDisabled?: boolean;
    /**
     * Optional tooltip text for the "Create with AI Agent" option (e.g. explaining a missing
     * prerequisite). Shown on hover/focus regardless of whether the option is disabled.
     */
    createWithAgentTooltipText?: string;
    onCreateThresholdRule?: () => void;
    legacyRuleTypes?: LegacyRuleTypeItem[];
}
export declare const RuleCreateOptionsFlyout: ({ onClose, onCreateEsqlRule, onCreateWithAgent, createWithAgentDisabled, createWithAgentTooltipText, onCreateThresholdRule, legacyRuleTypes, }: RuleCreateOptionsFlyoutProps) => React.JSX.Element;
