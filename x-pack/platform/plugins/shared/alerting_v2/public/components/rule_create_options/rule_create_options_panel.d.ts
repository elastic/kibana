import React from 'react';
import type { RuleManagementABSkillRequirements } from '../../hooks/use_is_rule_management_ab_skill_available';
export interface LegacyRuleTypeItem {
    id: string;
    label: string;
    onClick: () => void;
    'data-test-subj'?: string;
}
interface RuleCreateOptionsPanelProps {
    onCreateEsqlRule: () => void;
    layout?: 'vertical' | 'horizontal';
    onCreateWithAgent: () => void;
    /**
     * When `true`, the "Create with AI Agent" option is rendered disabled (click is a no-op). Independent
     * of `createWithAgentTooltipText` — a disabled option need not have a tooltip, and a tooltip can be
     * shown without disabling.
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
/**
 * Builds the tooltip shown on the disabled "Create with agent" entry points, naming the specific
 * prerequisite(s) the user is missing. Returns `undefined` when the skill is fully available (the
 * option should then be enabled). Shared so all entry points produce the same message.
 */
export declare const getCreateWithAgentTooltipText: ({ hasAgentBuilderCapability, isExperimentalFeaturesEnabled, }: RuleManagementABSkillRequirements) => string | undefined;
export declare const RuleCreateOptionsPanel: React.FC<RuleCreateOptionsPanelProps>;
export {};
