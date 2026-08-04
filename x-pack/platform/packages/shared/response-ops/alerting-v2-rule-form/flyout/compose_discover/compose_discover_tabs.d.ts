import React from 'react';
import { type monaco } from '@kbn/code-editor';
import type { RuleQuery } from '../../form/types';
import type { QueryTab } from './types';
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
    tabs: QueryTab[];
    onAlertEditorMount?: (editor: IStandaloneCodeEditor) => void;
    onRecoveryEditorMount?: (editor: IStandaloneCodeEditor) => void;
    /**
     * When true, only the editor content is rendered — the tab bar is omitted.
     * Used when the parent renders tabs in the flyout header instead.
     */
    hideTabBar?: boolean;
    /** When true, all editable query blocks are read-only. Used by Rule Builder preview mode. */
    readOnly?: boolean;
}
export declare const ALERT_TAB_DISABLED_TOOLTIP: string;
export declare const isAlertTabDisabled: (tabs: QueryTab[], baseQueryOrRuleQuery: string | RuleQuery) => boolean;
export declare const resolveActiveQueryTab: (tabs: QueryTab[], activeTab: QueryTab, baseQuery: string) => QueryTab;
interface QueryTabButtonProps {
    tab: {
        id: QueryTab;
        label: string;
    };
    isSelected: boolean;
    onSelect: (tab: QueryTab) => void;
    baseQuery: string;
    tabs: QueryTab[];
    dataTestSubjPrefix: string;
}
export declare const QueryTabButton: React.FC<QueryTabButtonProps>;
export declare const TAB_DEFINITIONS: Array<{
    id: QueryTab;
    label: string;
}>;
export declare const ComposeDiscoverTabs: React.FC<ComposeDiscoverTabsProps>;
export {};
