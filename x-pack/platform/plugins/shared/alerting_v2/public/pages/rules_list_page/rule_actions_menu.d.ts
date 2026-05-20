import React from 'react';
import type { RuleApiResponse } from '../../services/rules_api';
export interface RuleActionsMenuProps {
    rule: RuleApiResponse;
    onEdit: (rule: RuleApiResponse) => void;
    onClone: (rule: RuleApiResponse) => void;
    onDelete: (rule: RuleApiResponse) => void;
    onToggleEnabled: (rule: RuleApiResponse) => void;
}
export declare const RuleActionsMenu: ({ rule, onEdit, onClone, onDelete, onToggleEnabled, }: RuleActionsMenuProps) => React.JSX.Element;
