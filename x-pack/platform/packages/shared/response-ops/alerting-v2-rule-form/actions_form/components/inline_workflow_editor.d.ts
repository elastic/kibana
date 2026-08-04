import React from 'react';
import type { InlineWorkflowActionDraft } from '../types';
export interface InlineWorkflowEditorProps {
    value: InlineWorkflowActionDraft;
    onChange: (next: InlineWorkflowActionDraft) => void;
}
export declare const InlineWorkflowEditor: ({ value, onChange }: InlineWorkflowEditorProps) => React.JSX.Element | null;
