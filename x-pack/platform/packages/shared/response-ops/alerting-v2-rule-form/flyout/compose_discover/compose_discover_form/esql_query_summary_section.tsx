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
import type { RuleQuery } from '../../../form/types';
import { QueryBlock, QuerySummary } from '../query_summary';
import { splitResultToRuleQuery } from '../use_heuristic_split';

/**
 * Read-only summary of the applied ES|QL query on step 1. The heuristic split
 * is no longer shown in the editor (unified create flow) — it is surfaced here,
 * read-only, with copy + an edit CTA. A successful split is a `composed` query
 * (base + alert segment); a base-only query with no alert condition is persisted
 * as `standalone` (the whole query is the breach query, so every row is a breach).
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
 * For standalone queries the outcome is derived by running the same heuristic
 * split on the breach query text. A standalone rule whose query already contains
 * a filtering condition returns 'success' so that no false "No alert condition"
 * callout appears (e.g. a rule like `FROM ... | WHERE c > 3` stored as standalone).
 */
export const getEsqlSummaryState = (
  queryCommitted: boolean,
  query: RuleQuery
): EsqlSummaryState => {
  if (!queryCommitted) return 'before_apply';

  if (query.format === 'standalone') {
    return splitResultToRuleQuery(query.breach.query).outcome;
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

const getSummaryCallout = (state: EsqlSummaryState): React.ReactElement | null => {
  if (state === 'empty') return <EmptyCallout />;
  if (state === 'no_alert_condition') return <NoAlertConditionCallout />;
  return null;
};

interface EsqlQuerySummarySectionProps {
  query: RuleQuery;
  queryCommitted: boolean;
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
  isEditorOpen,
  onOpenEditor,
}) => {
  const state = getEsqlSummaryState(queryCommitted, query);
  const showBlocks = state !== 'before_apply';

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
      <EuiText size="s" color="subdued">
        {DESCRIPTIONS[state]}
      </EuiText>
      <EuiSpacer size="s" />

      {getSummaryCallout(state)}
      {state !== 'success' && state !== 'before_apply' && <EuiSpacer size="m" />}

      {showBlocks ? (
        query.format === 'standalone' ? (
          <QueryBlock label={QUERY_LABEL} query={query.breach.query} emptyMessage={NOT_DEFINED} />
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
        iconType={isEditCta ? 'chevronLimitLeft' : 'code'}
        isDisabled={isEditorOpen}
        onClick={onOpenEditor}
        data-test-subj="esqlSummaryOpenEditor"
      >
        {ctaLabel}
      </EuiButton>
    </div>
  );
};
