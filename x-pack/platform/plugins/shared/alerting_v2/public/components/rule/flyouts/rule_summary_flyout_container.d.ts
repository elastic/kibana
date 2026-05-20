import React from 'react';
import type { RuleApiResponse } from '../../../services/rules_api';
interface Props {
    ruleId: string;
    onClose: () => void;
    onEdit: (rule: RuleApiResponse) => void;
    onClone: (rule: RuleApiResponse) => void;
}
export declare const RuleSummaryFlyoutContainer: ({ ruleId, onClose, onEdit, onClone }: Props) => React.JSX.Element;
export {};
