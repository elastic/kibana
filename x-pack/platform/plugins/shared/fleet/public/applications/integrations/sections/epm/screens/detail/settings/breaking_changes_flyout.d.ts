import React from 'react';
import { type BreakingChangesLog } from '../utils';
interface BreakingChangesFlyoutProps {
    breakingChanges: BreakingChangesLog;
    onClose: () => void;
}
export declare const BreakingChangesFlyout: ({ onClose, breakingChanges }: BreakingChangesFlyoutProps) => React.JSX.Element;
export {};
