import React from 'react';
import { type monaco } from '@kbn/code-editor';
import type { QueryTab } from './types';
/**
 * Self-contained ES|QL sandbox that handles data fetching and renders the full
 * query preview UI: code editor (or multi-tab editors), date picker, search
 * button, chart, and results grid.
 *
 * ## Editor modes
 *
 * - **Single editor** (default) — when `tabs` is absent or empty, renders a
 *   plain `CodeEditor`. Pass `onQueryChange` to make it editable.
 * - **Multi-tab editors** — when `tabs` is non-empty (e.g. `['base', 'alert']`),
 *   renders `ComposeDiscoverTabs` with a tab bar. The `tabProps` fields drive
 *   the split query blocks.
 *
 * Requires `RuleFormProvider` and `QueryClientProvider` in the ancestor tree.
 */
export interface QuerySandboxProps {
    query: string;
    onQueryChange?: (query: string) => void;
    timeField: string;
    onTimeFieldChange?: (timeField: string) => void;
    dateRange: {
        dateStart: string;
        dateEnd: string;
    };
    onDateRangeChange: (range: {
        dateStart: string;
        dateEnd: string;
    }) => void;
    /** Execute the query on mount. */
    autoRun?: boolean;
    /**
     * When provided, time-field resolution is owned by the parent (e.g. compose
     * flyout) and the sandbox only displays the options without fetching.
     * Pass `undefined` (not `[]`) to let the sandbox resolve the time field itself —
     * an empty array skips resolution and renders an empty time-field select.
     */
    timeFieldOptions?: Array<{
        value: string;
        text: string;
    }>;
    /** Required with `timeFieldOptions` when the parent gates autoRun on resolution. */
    isTimeFieldResolved?: boolean;
    /**
     * Optional help text rendered above the editor. The caller is responsible for
     * content and styling (e.g. `<EuiText size="s">`). A spacer is added automatically
     * below it. Absent or `undefined` → nothing is rendered.
     */
    helpText?: React.ReactNode;
    /**
     * Optional actions rendered right-aligned in the ES|QL query header row, just before
     * the Search button. Use for header-level controls such as Split / Merge buttons.
     * Absent or `undefined` → nothing is rendered.
     */
    headerActions?: React.ReactNode;
    /**
     * When provided, the editor panel renders `ComposeDiscoverTabs` with a tab
     * bar instead of a single `CodeEditor`. Absent or `[]` → single editor.
     */
    tabProps?: {
        tabs: QueryTab[];
        activeTab: QueryTab;
        onTabChange: (tab: QueryTab) => void;
        baseQuery: string;
        alertBlock: string;
        recoveryBlock: string;
        onBaseQueryChange: (v: string) => void;
        onAlertBlockChange: (v: string) => void;
        onRecoveryBlockChange: (v: string) => void;
        onAlertEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
        onRecoveryEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
        readOnly?: boolean;
    };
    /**
     * Static validation error messages for the active tab's query — e.g. from a
     * blocked Apply. Rendered next to the editor, independent of `hasRun`/`isError`
     * (which only reflect query *execution*, not static validation).
     */
    validationError?: string[];
}
export declare const QuerySandbox: React.FC<QuerySandboxProps>;
