import type { PolicyExecutionHistoryItem } from '@kbn/alerting-v2-schemas';
import React from 'react';
interface Props {
    rules: PolicyExecutionHistoryItem['rules'];
    maxVisibleRules?: number;
    totalRuleCount: number;
    activeRuleId: string | null;
    onRuleClick: (ruleId: string) => void;
    canReadRules: boolean;
}
export declare const RulesCell: ({ rules, maxVisibleRules, totalRuleCount, activeRuleId, onRuleClick, canReadRules, }: Props) => React.JSX.Element | null;
export {};
