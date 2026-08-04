import React from 'react';
import type { PolicyExecutionOutcome } from '@kbn/alerting-v2-schemas';
export type PolicyOutcomeFilter = 'all' | PolicyExecutionOutcome;
export interface RuleOption {
    id: string;
    name: string;
}
interface ExecutionHistorySearchBarProps {
    onSearchChange: (search: string) => void;
    outcome: PolicyOutcomeFilter;
    onOutcomeChange: (outcome: PolicyOutcomeFilter) => void;
    ruleFilters?: RuleOption[];
    onRuleFiltersChange?: (rules: RuleOption[]) => void;
    showRuleFilter?: boolean;
}
export declare const ExecutionHistorySearchBar: ({ onSearchChange, outcome, onOutcomeChange, ruleFilters, onRuleFiltersChange, showRuleFilter, }: ExecutionHistorySearchBarProps) => React.JSX.Element;
export {};
