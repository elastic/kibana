/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { Argument, InvestigationRecord } from '../../../../common/investigations/types';
import { RelativeTime } from '../shared/relative_time';
import type { TabId } from '../tabs/tab_props';
import { BalanceView, ChainView, MapView } from './argument_views';
import {
  STRENGTH_COLORS,
  STRENGTH_LABELS,
  collectArgumentRefs,
  normalizeArgument,
} from './claim_utils';
import { useEvidenceByRefs } from './use_evidence_lookup';
import * as i18n from './translations';

type ArgumentViewId = 'chain' | 'map' | 'balance';

const toView = (id: string): ArgumentViewId =>
  id === 'map' ? 'map' : id === 'balance' ? 'balance' : 'chain';

export interface ArgumentFlyoutProps {
  record: InvestigationRecord;
  argument: Argument;
  /** Names what the argument is about, such as "Claim C3" or "Verdict". */
  title: string;
  onClose: () => void;
  onNavigateTab: (tab: TabId, opts?: { itemId?: string }) => void;
  /** Extra actions shown in the footer next to Close (approve, set a determination...). */
  footer?: React.ReactNode;
  /** A notice under the header, such as "Superseded by your determination". */
  notice?: React.ReactNode;
}

const ISO_PREFIX = /^\d{4}-\d{2}-\d{2}T/;

const When: React.FC<{ value: string }> = ({ value }) =>
  ISO_PREFIX.test(value) ? <RelativeTime value={value} /> : <>{value}</>;
When.displayName = 'When';

/** The evidence and reasoning behind a verdict, claim or proposal, as a chain, a map or a balance. */
export const ArgumentFlyout: React.FC<ArgumentFlyoutProps> = ({
  record,
  argument: rawArgument,
  title,
  onClose,
  onNavigateTab,
  footer,
  notice,
}) => {
  const titleId = useGeneratedHtmlId();
  const viewGroupId = useGeneratedHtmlId({ prefix: 'argumentView' });
  const [view, setView] = useState<ArgumentViewId>('chain');
  const argument = useMemo(() => normalizeArgument(rawArgument), [rawArgument]);
  const refs = useMemo(() => collectArgumentRefs(argument), [argument]);
  const { byRef } = useEvidenceByRefs(record.id, refs);

  const openEvidence = useCallback(
    (itemId: string) => {
      onClose();
      onNavigateTab('evidence', { itemId });
    },
    [onClose, onNavigateTab]
  );

  const viewProps = { argument, byRef, onOpenEvidence: openEvidence };

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      ownFocus
      aria-labelledby={titleId}
      data-test-subj="investigationArgumentFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="investigationArgumentKind">
              {title}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge
              color={STRENGTH_COLORS[argument.strength]}
              data-test-subj="investigationArgumentStrength"
            >
              {STRENGTH_LABELS[argument.strength]}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiTitle size="s">
          <h2 id={titleId}>{argument.claim}</h2>
        </EuiTitle>
        <EuiText size="xs" color="subdued">
          {i18n.ASSERTED_BY} {argument.by}
          {', '}
          <When value={argument.when} />
          {'. '}
          {argument.condition}
        </EuiText>
        {notice ? (
          <>
            <EuiSpacer size="s" />
            {notice}
          </>
        ) : null}
        {argument.confidence !== null ? (
          <>
            <EuiSpacer size="s" />
            <EuiProgress
              value={argument.confidence}
              max={100}
              size="m"
              color={argument.confidence >= 70 ? 'success' : 'primary'}
              label={i18n.CONFIDENCE}
              valueText={`${argument.confidence}%`}
              data-test-subj="investigationArgumentConfidence"
            />
          </>
        ) : null}
        <EuiSpacer size="s" />
        <EuiButtonGroup
          legend={i18n.ARGUMENT_VIEW_LEGEND}
          idSelected={view}
          onChange={(id) => setView(toView(id))}
          buttonSize="compressed"
          options={[
            {
              id: 'chain',
              label: i18n.VIEW_CHAIN,
              'data-test-subj': 'investigationArgumentViewChain',
            },
            { id: 'map', label: i18n.VIEW_MAP, 'data-test-subj': 'investigationArgumentViewMap' },
            {
              id: 'balance',
              label: i18n.VIEW_BALANCE,
              'data-test-subj': 'investigationArgumentViewBalance',
            },
          ]}
          data-test-subj={viewGroupId}
        />
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          {view === 'chain' ? i18n.HELP_CHAIN : view === 'map' ? i18n.HELP_MAP : i18n.HELP_BALANCE}
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {view === 'chain' ? <ChainView {...viewProps} /> : null}
        {view === 'map' ? <MapView {...viewProps} /> : null}
        {view === 'balance' ? <BalanceView {...viewProps} /> : null}
        <EuiSpacer size="m" />
        <EuiPanel
          color="subdued"
          hasShadow={false}
          paddingSize="s"
          data-test-subj="investigationArgumentChanges"
        >
          <EuiText size="xs" color="subdued">
            <strong>{i18n.WHAT_WOULD_CHANGE_THIS}</strong>
          </EuiText>
          <EuiText size="s">{argument.changes}</EuiText>
        </EuiPanel>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onClose} data-test-subj="investigationArgumentClose">
              {i18n.CLOSE}
            </EuiButton>
          </EuiFlexItem>
          {footer ? <EuiFlexItem grow={false}>{footer}</EuiFlexItem> : null}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
ArgumentFlyout.displayName = 'ArgumentFlyout';
