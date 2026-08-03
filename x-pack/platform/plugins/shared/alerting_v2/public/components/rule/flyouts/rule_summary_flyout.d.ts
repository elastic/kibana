import type { EuiFlyoutProps } from '@elastic/eui';
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
    onRun: (rule: RuleApiResponse) => void;
    canWrite?: boolean;
    session?: EuiFlyoutProps['session'];
    ownFocus?: EuiFlyoutProps['ownFocus'];
    hasAnimation?: EuiFlyoutProps['hasAnimation'];
}
export declare const RuleSummaryFlyout: ({ rule, onClose, onEdit, onQuickEdit, onClone, onDelete, onToggleEnabled, onRun, canWrite, session, ownFocus, hasAnimation, }: RuleSummaryFlyoutProps) => React.JSX.Element;
