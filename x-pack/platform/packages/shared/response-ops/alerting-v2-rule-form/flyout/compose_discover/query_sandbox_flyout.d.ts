import React from 'react';
import type { monaco } from '@kbn/code-editor';
import type { RuleQuery } from '../../form/types';
import type { QueryTab } from './types';
/**
 * Props for the Discover Sandbox flyout — a full-screen ES|QL editor with live
 * query execution, time-range selection, and a results grid.
 *
 * ## Usage modes
 *
 * **Compose Discover flyout (editable)** — pass `query`, `onQueryChange`, and `onApply`.
 * The parent holds the editing buffer; Apply commits it to RHF.
 *
 * **Preview / read-only** — omit `onQueryChange` (makes all editors read-only) and
 * omit `onApply` (hides the Apply button). Only the close button is shown.
 *
 * **Edit without Apply** — pass `onQueryChange` but omit `onApply`. The flyout has
 * editors but no Apply button; the caller commits on its own terms.
 *
 * ## State ownership
 *
 * `QuerySandboxFlyout` is a **props-only component** — it owns no query state.
 * The parent holds `query`, `timeField`, and `dateRange` as separate `useState`s and
 * passes them down. `query` and `timeField` reset to committed RHF values on close;
 * `dateRange` persists across open/close cycles.
 */
export interface QuerySandboxFlyoutProps {
    /** The live query being edited. Shape drives the split-editor layout. */
    query: RuleQuery;
    /** Called on every editor change. Absent → all query editors are read-only. */
    onQueryChange?: (q: RuleQuery) => void;
    /**
     * Which tabs to show. Absent or [] → single editor, no tab bar.
     * ['base', 'alert'] → base-alert split; ['recovery'] → recovery tab only.
     */
    tabs?: QueryTab[];
    /** Active tab — ignored when tabs is absent/[]. */
    activeTab?: QueryTab;
    /** Should always be provided when tabs is non-empty — without it tab clicks are no-ops. */
    onTabChange?: (tab: QueryTab) => void;
    timeField: string;
    /** Absent → time field selector is read-only. */
    onTimeFieldChange?: (tf: string) => void;
    /** When provided, resolution is owned by the parent and passed through to QuerySandbox. */
    timeFieldOptions?: Array<{
        value: string;
        text: string;
    }>;
    isTimeFieldResolved?: boolean;
    /** Preview date range. Never resets on close — caller owns persistence. */
    dateRange: {
        dateStart: string;
        dateEnd: string;
    };
    /** Always required — date range is always interactive. */
    onDateRangeChange: (r: {
        dateStart: string;
        dateEnd: string;
    }) => void;
    /** When provided an Apply button is shown. No-args: caller already holds current state. */
    onApply?: () => void;
    onClose: () => void;
    /**
     * Optional help text rendered above the editor — passed through to `QuerySandbox`.
     * Callers are responsible for content and styling (e.g. wrapping in `<EuiText>`).
     */
    helpText?: React.ReactNode;
    /**
     * Optional actions rendered right-aligned in the ES|QL query header row — passed through
     * to `QuerySandbox`. Use for header-level controls such as Split / Merge buttons.
     */
    headerActions?: React.ReactNode;
    title?: string;
    onAlertEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
    onRecoveryEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}
export declare const QuerySandboxFlyout: React.FC<QuerySandboxFlyoutProps>;
