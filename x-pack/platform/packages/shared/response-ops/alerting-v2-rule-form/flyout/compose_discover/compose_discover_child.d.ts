import React from 'react';
import { type monaco } from '@kbn/code-editor';
import type { ComposeDiscoverState, ComposeDiscoverAction, SandboxTabConfig, SandboxApplyData } from './types';
interface ComposeDiscoverChildProps {
    state: ComposeDiscoverState;
    dispatch: React.Dispatch<ComposeDiscoverAction>;
    /** Controls whether the Sandbox renders a single editor or a Base/Alert/Recovery tab layout. */
    tabConfig: SandboxTabConfig;
    onAlertEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
    onRecoveryEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
    onClose: () => void;
    /** Called when the user clicks "Apply changes". The parent writes the query
     *  into RHF (the source of truth) and updates the reducer cache. */
    onApply: (data: SandboxApplyData) => void;
}
export declare const ComposeDiscoverChild: React.FC<ComposeDiscoverChildProps>;
export {};
