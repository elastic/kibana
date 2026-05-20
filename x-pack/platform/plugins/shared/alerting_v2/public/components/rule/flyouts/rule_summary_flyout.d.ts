import React from 'react';
import type { RuleApiResponse } from '../../../services/rules_api';
export interface RuleSummaryFlyoutProps {
    rule: RuleApiResponse;
    onClose: () => void;
    onEdit: (rule: RuleApiResponse) => void;
    onQuickEdit?: (rule: RuleApiResponse) => void;
    onClone: (rule: RuleApiResponse) => void;
    onDelete: (rule: RuleApiResponse) => void;
    onToggleEnabled: (rule: RuleApiResponse) => void;
}
export declare const RuleSummaryFlyout: ({ rule, onClose, onEdit, onQuickEdit, onClone, onDelete, onToggleEnabled, }: RuleSummaryFlyoutProps) => React.JSX.Element;
