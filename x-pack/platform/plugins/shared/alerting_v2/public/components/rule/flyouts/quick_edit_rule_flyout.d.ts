import React from 'react';
import type { RuleApiResponse } from '../../../services/rules_api';
export interface QuickEditRuleFlyoutProps {
    rule: RuleApiResponse;
    onClose: () => void;
}
export declare const QuickEditRuleFlyout: ({ rule, onClose }: QuickEditRuleFlyoutProps) => React.JSX.Element;
