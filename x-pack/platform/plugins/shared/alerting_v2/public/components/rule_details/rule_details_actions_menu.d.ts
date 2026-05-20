import React from 'react';
export interface RuleDetailsActionsMenuProps {
    showDeleteConfirmation: () => void;
    onClone: () => void;
}
export declare const RuleDetailsActionsMenu: React.FunctionComponent<RuleDetailsActionsMenuProps>;
