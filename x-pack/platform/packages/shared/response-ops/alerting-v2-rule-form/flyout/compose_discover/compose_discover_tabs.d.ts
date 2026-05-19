import React from 'react';
import { type monaco } from '@kbn/code-editor';
import type { QueryTab, SandboxTabConfig } from './types';
type IStandaloneCodeEditor = monaco.editor.IStandaloneCodeEditor;
interface ComposeDiscoverTabsProps {
    baseQuery: string;
    alertBlock: string;
    recoveryBlock: string;
    onBaseQueryChange: (val: string) => void;
    onAlertBlockChange: (val: string) => void;
    onRecoveryBlockChange: (val: string) => void;
    activeTab: QueryTab;
    onTabChange: (tab: QueryTab) => void;
    tabConfig: SandboxTabConfig;
    onAlertEditorMount?: (editor: IStandaloneCodeEditor) => void;
    onRecoveryEditorMount?: (editor: IStandaloneCodeEditor) => void;
    /**
     * When true, only the editor content is rendered — the tab bar is omitted.
     * Used when the parent renders tabs in the flyout header instead.
     */
    hideTabBar?: boolean;
}
export declare const TAB_DEFINITIONS: Array<{
    id: QueryTab;
    label: string;
}>;
export declare function visibleTabIds(tabConfig: SandboxTabConfig): QueryTab[];
export declare const ComposeDiscoverTabs: React.FC<ComposeDiscoverTabsProps>;
export {};
