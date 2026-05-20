import React from 'react';
import { type monaco } from '@kbn/code-editor';
import type { SandboxDraft, SandboxTabConfig, QueryTab } from './types';
/**
 * Props for the Discover Sandbox flyout — a full-screen ES|QL editor with live
 * query execution, time-range selection, and a results grid.
 *
 * ## Usage modes
 *
 * **Compose Discover flyout (default)** — the parent owns the draft and commits it
 * to RHF on Apply. Pass `draft`, `onDraftChange`, and `onApply`.
 *
 * **Rule Builder preview** — show the committed query read-only so the user can
 * inspect it before closing. Omit `onDraftChange` (makes editors read-only) and
 * omit `onApply` (hides the Apply button; only the close button is shown).
 *
 * **Rule Builder edit** — let the user edit the query but commit on their own
 * terms. Pass `onDraftChange` but omit `onApply` (close-only, no Apply button).
 *
 * ## State ownership
 *
 * `QuerySandboxFlyout` is a **props-only component** — it owns no query state.
 * The parent is responsible for:
 * - Holding `SandboxDraft` (editing buffer) via `useSandboxDraft`
 * - Holding `timeField` in `SandboxDraft` (editing buffer); committed to RHF on Apply
 * - Owning `activeTab` in the UI-state reducer
 * - Calling `draftToRuleQuery(draft, tracking)` and writing to RHF on Apply
 *
 * @see useSandboxDraft — editing buffer hook; keeps draft across open/close cycles
 * @see draftToRuleQuery — converts draft + tracking flag to the `RuleQuery` API shape
 */
export interface QuerySandboxFlyoutProps {
    /** Editing buffer for all query strings and the preview date range. */
    draft: SandboxDraft;
    /**
     * Called with a partial update on every editor keystroke, date-picker change,
     * and time field selection. When absent, all editors and the time field selector
     * are read-only (mirrors the uncontrolled-input pattern).
     */
    onDraftChange?: (update: Partial<SandboxDraft>) => void;
    /** Controls whether the Sandbox renders a single editor or a split Base/Alert/Recovery layout. */
    tabConfig: SandboxTabConfig;
    /** Active tab, owned by the parent reducer and passed down as a controlled value. */
    activeTab: QueryTab;
    onTabChange: (tab: QueryTab) => void;
    /**
     * When true, all query editors are locked regardless of `onDraftChange`.
     * Use this for Rule Builder read-only preview mode.
     */
    readOnlyQueries?: boolean;
    /**
     * When provided, an "Apply changes" button is rendered in the flyout footer.
     * Clicking it should commit `draft` to RHF (e.g. via `draftToRuleQuery`) and
     * close the child flyout.
     * When absent, no Apply button is shown — the flyout is close-only.
     */
    onApply?: () => void;
    onClose: () => void;
    /** Flyout header title. Defaults to "Query sandbox". */
    title?: string;
    /** Called with the Monaco editor instance when the alert-block editor mounts.
     *  Use this to register split-query autocomplete providers at the flyout level. */
    onAlertEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
    /** Called with the Monaco editor instance when the recovery-block editor mounts. */
    onRecoveryEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}
export declare const QuerySandboxFlyout: React.FC<QuerySandboxFlyoutProps>;
