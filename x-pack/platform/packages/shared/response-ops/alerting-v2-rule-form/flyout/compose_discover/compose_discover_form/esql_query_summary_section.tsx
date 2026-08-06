/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RuleKind, RuleQuery } from '../../../form/types';
import { getBreachQuery } from '../../../form/utils/query_helpers';
import { QueryBlock, QuerySummary } from '../query_summary';
import { splitResultToRuleQuery } from '../use_heuristic_split';

/**
 * Read-only summary of the applied ES|QL query on step 1. The heuristic split
 * is no longer shown in the editor (unified create flow) — it is surfaced here,
 * read-only, with copy + an edit CTA. A successful split is a `composed` query
 * (base + alert segment); a base-only query is still `composed` with an empty
 * segment (save rejects it until a condition is added — surfaced via toast).
 *
 * Signal rules always render as a single query block — we never display a
 * guessed base/condition split for signal, even if the in-progress query is
 * still composed during authoring. Alert-condition guidance (subtitle + callout)
 * is also hidden for signal; a conditionless query is the normal signal shape.
 */
export type EsqlSummaryState =
  | 'before_apply'
  | 'success'
  | 'no_alert_condition'
  | 'split_failed'
  | 'empty';

/**
 * Derives the summary state from the committed query. Callout priority is
 * encoded by the branch order: empty → split failed → no alert condition.
 *
 * When `forceUnified` is set (signal rules), state is derived from the assembled
 * breach query text via the same heuristic — used only for guidance callouts,
 * never to render a split UI.
 *
 * For standalone queries the outcome is derived by running the same heuristic
 * split on the breach query text. A standalone rule whose query already contains
 * an alert condition returns 'success' so that no false "No alert condition"
 * callout appears (e.g. a rule like `FROM ... | WHERE c > 3` stored as standalone).
 */
export const getEsqlSummaryState = (
  queryCommitted: boolean,
  query: RuleQuery,
  { forceUnified = false }: { forceUnified?: boolean } = {}
): EsqlSummaryState => {
  if (!queryCommitted) return 'before_apply';

  if (forceUnified || query.format === 'standalone') {
    const text = query.format === 'standalone' ? query.breach.query : getBreachQuery(query);
    return splitResultToRuleQuery(text).outcome;
  }

  const hasBase = query.base.trim().length > 0;
  const hasSegment = query.breach.segment.trim().length > 0;

  if (!hasBase && !hasSegment) return 'empty';
  if (!hasBase) return 'split_failed';
  if (!hasSegment) return 'no_alert_condition';
  return 'success';
};

const NOT_DEFINED = i18n.translate('xpack.alertingV2.composeDiscover.esqlSummary.notDefined', {
  defaultMessage: 'Not defined',
});

const DESCRIPTIONS: Record<EsqlSummaryState, string> = {
  before_apply: i18n.translate(
    'xpack.alertingV2.composeDiscover.esqlSummary.beforeApplyDescription',
    {
      defaultMessage: 'Open the editor to write your ES|QL query',
    }
  ),
  success: i18n.translate('xpack.alertingV2.composeDiscover.esqlSummary.successDescription', {
    defaultMessage: 'Search query and alert condition identified',
  }),
  no_alert_condition: i18n.translate(
    'xpack.alertingV2.composeDiscover.esqlSummary.noAlertConditionDescription',
    { defaultMessage: 'Base query defined — no separate alert condition' }
  ),
  split_failed: i18n.translate(
    'xpack.alertingV2.composeDiscover.esqlSummary.splitFailedDescription',
    {
      defaultMessage: 'Review your query or separate it manually',
    }
  ),
  empty: i18n.translate('xpack.alertingV2.composeDiscover.esqlSummary.emptyDescription', {
    defaultMessage: 'Define an ES|QL query in the editor',
  }),
};

const EmptyCallout: React.FC = () => (
  <EuiCallOut
    announceOnMount={false}
    size="s"
    color="warning"
    iconType="warning"
    data-test-subj="esqlSummaryEmptyCallout"
    title={i18n.translate('xpack.alertingV2.composeDiscover.esqlSummary.emptyCalloutTitle', {
      defaultMessage: 'No query defined',
    })}
  >
    <FormattedMessage
      id="xpack.alertingV2.composeDiscover.esqlSummary.emptyCalloutBody"
      defaultMessage="Enter an ES|QL query in the editor before continuing."
    />
  </EuiCallOut>
);

const NoAlertConditionCallout: React.FC = () => (
  <EuiCallOut
    announceOnMount={false}
    size="s"
    color="primary"
    iconType="info"
    data-test-subj="esqlSummaryNoAlertConditionCallout"
    title={i18n.translate(
      'xpack.alertingV2.composeDiscover.esqlSummary.noAlertConditionCalloutTitle',
      { defaultMessage: 'No alert condition' }
    )}
  >
    <FormattedMessage
      id="xpack.alertingV2.composeDiscover.esqlSummary.noAlertConditionCalloutBody"
      defaultMessage="Without an alert condition, every row returned by the base query is treated as a breach."
    />
  </EuiCallOut>
);

const getSummaryCallout = (state: EsqlSummaryState, kind: RuleKind): React.ReactElement | null => {
  if (state === 'empty') return <EmptyCallout />;
  // Alert-condition guidance is meaningless for signal rules.
  if (state === 'no_alert_condition' && kind === 'alert') return <NoAlertConditionCallout />;
  return null;
};

/**
 * Signal rules omit alert-condition guidance. For committed signal queries the
 * subtitle that talks about base/alert split is hidden entirely.
 */
const getDescription = (state: EsqlSummaryState, kind: RuleKind): string | null => {
  if (kind === 'signal' && (state === 'no_alert_condition' || state === 'success')) {
    return null;
  }
  return DESCRIPTIONS[state];
};

interface EsqlQuerySummarySectionProps {
  query: RuleQuery;
  queryCommitted: boolean;
  /** When `signal`, always render a single query block (never a guessed split). */
  kind: RuleKind;
  /** Disables the edit CTA while the sandbox is already open. */
  isEditorOpen: boolean;
  onOpenEditor: () => void;
}

const QUERY_LABEL = i18n.translate('xpack.alertingV2.composeDiscover.esqlSummary.queryLabel', {
  defaultMessage: 'Query',
});

const BASE_QUERY_LABEL = (
  <FormattedMessage
    id="xpack.alertingV2.composeDiscover.esqlSummary.baseQueryLabel"
    defaultMessage="Base query"
  />
);

const ALERT_CONDITION_LABEL = (
  <FormattedMessage
    id="xpack.alertingV2.composeDiscover.esqlSummary.alertConditionLabel"
    defaultMessage="Alert condition"
  />
);

export const EsqlQuerySummarySection: React.FC<EsqlQuerySummarySectionProps> = ({
  query,
  queryCommitted,
  kind,
  isEditorOpen,
  onOpenEditor,
}) => {
  const forceUnified = kind === 'signal';
  const state = getEsqlSummaryState(queryCommitted, query, { forceUnified });
  const showBlocks = state !== 'before_apply';
  const showUnifiedBlock = forceUnified || query.format === 'standalone';
  const callout = getSummaryCallout(state, kind);
  const description = getDescription(state, kind);

  const isEditCta = state !== 'before_apply' && state !== 'empty';
  const ctaLabel = isEditCta
    ? i18n.translate('xpack.alertingV2.composeDiscover.esqlSummary.editQueryButtonLabel', {
        defaultMessage: 'Edit query',
      })
    : i18n.translate('xpack.alertingV2.composeDiscover.esqlSummary.openEditorButtonLabel', {
        defaultMessage: 'Open query editor',
      });

  return (
    <div data-test-subj={`esqlQuerySummarySection-${state}`}>
      {description != null && (
        <>
          <EuiText size="s" color="subdued">
            {description}
          </EuiText>
          <EuiSpacer size="s" />
        </>
      )}

      {callout}
      {callout != null && <EuiSpacer size="m" />}

      {showBlocks ? (
        showUnifiedBlock ? (
          <QueryBlock
            label={QUERY_LABEL}
            query={getBreachQuery(query)}
            emptyMessage={NOT_DEFINED}
          />
        ) : (
          <>
            <QueryBlock label={BASE_QUERY_LABEL} query={query.base} emptyMessage={NOT_DEFINED} />
            <EuiSpacer size="m" />
            <QueryBlock
              label={ALERT_CONDITION_LABEL}
              query={query.breach.segment}
              emptyMessage={NOT_DEFINED}
            />
          </>
        )
      ) : (
        <QuerySummary query="" emptyMessage={NOT_DEFINED} />
      )}

      <EuiSpacer size="s" />
      <EuiButton
        size="s"
        color={isEditCta ? 'text' : undefined}
        iconType={isEditCta ? 'chevronLimitLeft' : 'editorCodeBlock'}
        isDisabled={isEditorOpen}
        onClick={onOpenEditor}
        data-test-subj="esqlSummaryOpenEditor"
      >
        {ctaLabel}
      </EuiButton>
    </div>
  );
};
