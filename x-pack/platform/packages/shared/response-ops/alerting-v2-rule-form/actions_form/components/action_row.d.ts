import React from 'react';
import type { ActionDraft } from '../types';
interface ActionRowProps {
    action: ActionDraft;
    isExpanded: boolean;
    isInvalid: boolean;
    onToggleExpand: (id: string) => void;
    onRemove: (id: string) => void;
    onChange: (updated: ActionDraft) => void;
}
export declare const ActionRow: ({ action, isExpanded, isInvalid, onToggleExpand, onRemove, onChange, }: ActionRowProps) => React.JSX.Element;
export {};
