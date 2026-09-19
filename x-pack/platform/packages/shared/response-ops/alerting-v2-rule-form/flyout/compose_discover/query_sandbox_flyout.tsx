/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { monaco } from '@kbn/code-editor';
import { recoveryStrategy } from '@kbn/alerting-v2-schemas';
import type { RuleQuery, RuleRecovery } from '../../form/types';
import { getBreachQuery, getRecoverQuery } from '../../form/utils/query_helpers';
import { useRuleFormServices } from '../../form/contexts/rule_form_context';
import { useEsqlCallbacks } from '../../form/hooks/use_esql_callbacks';
import type { QueryTab } from './types';
import { QuerySandbox } from './query_sandbox';
import type { QuerySandboxProps } from './query_sandbox';
import { isAlertTabDisabled } from './compose_discover_tabs';
import { validateTabQueries, type TabValidationError } from './validate_tab_queries';

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
  /** The live query being edited. */
  query: RuleQuery;
  /** Called on every editor change. Absent → all query editors are read-only. */
  onQueryChange?: (q: RuleQuery) => void;
  /** The live recovery block being edited — only read when the `recovery` tab is shown. */
  recovery?: RuleRecovery;
  /** Called on every recovery editor change. */
  onRecoveryChange?: (recovery: RuleRecovery) => void;
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
  timeFieldOptions?: Array<{ value: string; text: string }>;
  isTimeFieldResolved?: boolean;
  /** Preview date range. Never resets on close — caller owns persistence. */
  dateRange: { dateStart: string; dateEnd: string };
  /** Always required — date range is always interactive. */
  onDateRangeChange: (r: { dateStart: string; dateEnd: string }) => void;
  /** When provided an Apply button is shown. No-args: caller already holds current state. */
  onApply?: () => void;
  onClose: () => void;
  /**
   * Optional help text rendered above the editor — passed through to `QuerySandbox`.
   * Callers are responsible for content and styling (e.g. wrapping in `<EuiText>`).
   */
  helpText?: React.ReactNode;
  /**
   * Optional actions rendered at the end of the in-editor toolbar — passed through
   * to `QuerySandbox`. Use for header-level controls such as Split / Merge buttons.
   */
  headerActions?: React.ReactNode;
  title?: string;
  onAlertEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  onRecoveryEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  onBaseEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  onSingleEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}

const QUERY_SANDBOX_TITLE_ID = 'composeDiscoverChildTitle';

export const QuerySandboxFlyout: React.FC<QuerySandboxFlyoutProps> = ({
  query,
  onQueryChange,
  recovery,
  onRecoveryChange,
  tabs,
  activeTab = 'alert',
  onTabChange,
  timeField,
  onTimeFieldChange,
  timeFieldOptions,
  isTimeFieldResolved,
  dateRange,
  onDateRangeChange,
  onApply,
  onClose,
  helpText,
  headerActions,
  onAlertEditorMount,
  onRecoveryEditorMount,
  onBaseEditorMount,
  onSingleEditorMount,
  title = i18n.translate('xpack.alertingV2.composeDiscover.querySandbox.defaultTitle', {
    defaultMessage: 'Query sandbox',
  }),
}) => {
  const isReadOnly = !onQueryChange;

  const recoveryBlock = recovery?.segment ?? '';

  const updateQuery = useCallback(
    (patch: { base?: string; breach?: string }) => {
      if (!onQueryChange) return;
      onQueryChange({
        base: patch.base ?? query.base,
        breach: { segment: patch.breach ?? query.breach.segment },
      });
    },
    [query, onQueryChange]
  );

  /* Preserves the current strategy so editing the block never rewrites the user's choice. */
  const updateRecoveryBlock = useCallback(
    (segment: string) => {
      onRecoveryChange?.({ strategy: recoveryStrategy.condition, ...recovery, segment });
    },
    [recovery, onRecoveryChange]
  );

  /*
   * Run whichever pipeline the active tab represents. Unified mode (no tabs)
   * has no per-tab concept — always run the full breach query.
   */
  const activeQuery = (() => {
    if (!tabs?.length) return getBreachQuery(query);
    switch (activeTab) {
      case 'base':
        return query.base;
      case 'recovery':
        return getRecoverQuery(query, recovery);
      default:
        return getBreachQuery(query);
    }
  })();

  /*
   * Apply is gated on static ES|QL validation of every tab — including ones the
   * user hasn't switched to. Validation runs on the Apply click rather than on
   * every keystroke, because the ES|QL callbacks issue real requests to
   * Elasticsearch; a one-shot check on an explicit action keeps typing snappy.
   * The Alert tab is skipped while it's disabled (base not yet defined): its
   * segment isn't part of the active pipeline, so it shouldn't block Apply.
   */
  const services = useRuleFormServices();
  const esqlCallbacks = useEsqlCallbacks({
    application: services.application,
    http: services.http,
    search: services.data.search.search,
  });

  const validationQueries = useMemo(() => {
    if (!tabs?.length) {
      return { alert: getBreachQuery(query) };
    }
    return {
      ...(tabs.includes('base') && { base: query.base }),
      ...(tabs.includes('alert') &&
        !isAlertTabDisabled(tabs, query) && { alert: getBreachQuery(query) }),
      ...(tabs.includes('recovery') && { recovery: getRecoverQuery(query, recovery) }),
    };
  }, [tabs, query, recovery]);

  const [isValidating, setIsValidating] = useState(false);
  const [applyErrors, setApplyErrors] = useState<TabValidationError[]>([]);
  const editingLocked = isReadOnly || isValidating;

  const handleApply = useCallback(async () => {
    if (!onApply) return;
    setIsValidating(true);
    try {
      const errors = await validateTabQueries(validationQueries, esqlCallbacks);
      setApplyErrors(errors);
      if (errors.length === 0) {
        onApply();
        return;
      }
      const [firstError] = errors;
      if (firstError.tab !== activeTab) {
        onTabChange?.(firstError.tab);
      }
    } finally {
      setIsValidating(false);
    }
  }, [onApply, validationQueries, esqlCallbacks, activeTab, onTabChange]);

  /*
   * Unified mode: the editor holds the whole pipeline, so write it to `base`
   * with an empty `segment` and `getBreachQuery` returns it verbatim. Writing
   * to `segment` would re-join base + segment and duplicate lines; the
   * heuristic split runs on Apply, not here.
   */
  const handleQueryChange = useCallback(
    (v: string) => updateQuery({ base: v, breach: '' }),
    [updateQuery]
  );

  /*
   * The active tab's own validation error, if any. handleApply already moved
   * the user to the first offending tab, so at most one entry is ever
   * relevant to what's currently on screen.
   */
  const activeValidationError = useMemo(
    () => applyErrors.find((e) => e.tab === activeTab)?.messages,
    [applyErrors, activeTab]
  );

  const tabProps: QuerySandboxProps['tabProps'] = useMemo(() => {
    if (!tabs?.length) return undefined;
    return {
      tabs,
      activeTab,
      onTabChange: onTabChange ?? (() => {}),
      baseQuery: query.base,
      alertBlock: query.breach.segment,
      recoveryBlock,
      onBaseQueryChange: (v: string) => updateQuery({ base: v }),
      onAlertBlockChange: (v: string) => updateQuery({ breach: v }),
      onRecoveryBlockChange: updateRecoveryBlock,
      onAlertEditorMount,
      onRecoveryEditorMount,
      onBaseEditorMount,
      readOnly: editingLocked,
    };
  }, [
    tabs,
    activeTab,
    onTabChange,
    query,
    recoveryBlock,
    updateQuery,
    updateRecoveryBlock,
    onAlertEditorMount,
    onRecoveryEditorMount,
    onBaseEditorMount,
    editingLocked,
  ]);

  return (
    <EuiFlyout
      type="overlay"
      size="fill"
      minWidth={700}
      onClose={onClose}
      aria-labelledby={QUERY_SANDBOX_TITLE_ID}
      closeButtonProps={{ 'data-test-subj': 'querySandboxClose' }}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" id={QUERY_SANDBOX_TITLE_ID}>
          <h3>{title}</h3>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <QuerySandbox
          query={activeQuery}
          onQueryChange={editingLocked ? undefined : handleQueryChange}
          timeField={timeField}
          onTimeFieldChange={onTimeFieldChange}
          timeFieldOptions={timeFieldOptions}
          isTimeFieldResolved={isTimeFieldResolved}
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          autoRun
          helpText={helpText}
          headerActions={headerActions}
          tabProps={tabProps}
          onSingleEditorMount={onSingleEditorMount}
          validationError={activeValidationError}
        />
      </EuiFlyoutBody>

      {onApply && (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={handleApply}
                isLoading={isValidating}
                data-test-subj="querySandboxApply"
              >
                {i18n.translate('xpack.alertingV2.composeDiscover.querySandbox.applyButtonLabel', {
                  defaultMessage: 'Apply changes',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
};
