/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { VERDICT_LABELS } from '../../../../common/investigations/types';
import type {
  AgentVerdict,
  AgentVerdictAlternative,
  AnalystVerdict,
  InvestigationRecord,
} from '../../../../common/investigations/types';
import { useUpdateRecord } from '../../hooks';
import { ICONS } from '../../icons';
import { ArgumentFlyout } from '../claims/argument_flyout';
import { countArgumentEvidence, normalizeArgument } from '../claims/claim_utils';
import { EvidenceCites } from '../claims/evidence_cites';
import { useEvidenceByRefs } from '../claims/use_evidence_lookup';
import { WhyButton } from '../claims/why_button';
import type { ModalName } from '../modals/modal_props';
import { ConfirmModal } from '../shared/confirm_modal';
import { RelativeTime } from '../shared/relative_time';
import { VerdictBadge } from '../shared/verdict_badge';
import type { TabId } from '../tabs/tab_props';
import { OverviewCard } from './overview_card';
import * as i18n from './translations';
import * as claimsI18n from '../claims/translations';

const ALTERNATIVE_COLORS: Record<
  AgentVerdictAlternative['badge'],
  'hollow' | 'warning' | 'danger'
> = {
  'Ruled out': 'hollow',
  Weakened: 'warning',
  Open: 'danger',
};

const ALTERNATIVE_LABELS: Record<AgentVerdictAlternative['badge'], string> = {
  'Ruled out': i18n.ALTERNATIVE_RULED_OUT,
  Weakened: i18n.ALTERNATIVE_WEAKENED,
  Open: i18n.ALTERNATIVE_OPEN,
};

interface VerdictViewProps {
  record: InvestigationRecord;
  isClosed: boolean;
  whyButton: React.ReactNode;
  onOpenModal: (name: ModalName) => void;
  onNavigateTab: (tab: TabId, opts?: { itemId?: string }) => void;
}

const NoVerdictView: React.FC<Pick<VerdictViewProps, 'isClosed' | 'onOpenModal'>> = ({
  isClosed,
  onOpenModal,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <OverviewCard
      title={i18n.YOUR_DETERMINATION}
      iconType={ICONS.verdict}
      tone="highlight"
      data-test-subj="investigationVerdictCard"
    >
      <EuiFlexGroup
        gutterSize="m"
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        wrap
      >
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3
              css={css`
                color: ${euiTheme.colors.textSubdued};
              `}
              data-test-subj="investigationVerdictValue"
            >
              {i18n.NOT_SET}
            </h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            {isClosed ? i18n.NO_VERDICT_CLOSED : i18n.NO_AGENT_ASSESSMENT}
          </EuiText>
        </EuiFlexItem>
        {!isClosed ? (
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={() => onOpenModal('determination')}
              data-test-subj="investigationVerdictSet"
            >
              {i18n.SET_YOUR_DETERMINATION}
            </EuiButton>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </OverviewCard>
  );
};
NoVerdictView.displayName = 'NoVerdictView';

const AnalystVerdictView: React.FC<
  VerdictViewProps & {
    analyst: AnalystVerdict;
    agent: AgentVerdict | null;
    flyout: React.ReactNode;
  }
> = ({ record, analyst, agent, isClosed, whyButton, flyout, onOpenModal }) => {
  const [isRevertOpen, setIsRevertOpen] = useState(false);
  const { mutate: updateRecord, isLoading: isReverting } = useUpdateRecord(record.id, {
    successMessage: i18n.REVERTED,
  });
  const differs = agent !== null && agent.classification !== analyst.verdict;

  return (
    <OverviewCard
      title={i18n.FINAL_VERDICT}
      iconType={ICONS.verdict}
      data-test-subj="investigationVerdictCard"
    >
      <EuiFlexGroup
        gutterSize="m"
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        wrap
      >
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h3 data-test-subj="investigationVerdictValue">
                  {VERDICT_LABELS[analyst.verdict]}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <VerdictBadge verdict={analyst.verdict} label={i18n.CURRENT_VERDICT} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiText size="xs" color="subdued" data-test-subj="investigationVerdictSetBy">
            {i18n.SET_BY(analyst.set_by.name)} <RelativeTime value={analyst.set_at} />
            {analyst.reason ? `. ${analyst.reason}` : ''}
          </EuiText>
        </EuiFlexItem>
        {!isClosed ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  iconType={ICONS.edit}
                  onClick={() => onOpenModal('determination')}
                  data-test-subj="investigationVerdictEdit"
                >
                  {i18n.EDIT}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  onClick={() => setIsRevertOpen(true)}
                  data-test-subj="investigationVerdictRevert"
                >
                  {i18n.REVERT_TO_AGENT}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {agent ? (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            responsive={false}
            wrap
            data-test-subj="investigationVerdictSuperseded"
          >
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{i18n.SUPERSEDED}</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.SUPERSEDED_LINE(agent.label, agent.confidence)}
                {differs ? ` ${i18n.DIFFERS}` : ''}
              </EuiText>
            </EuiFlexItem>
            {whyButton ? <EuiFlexItem grow={false}>{whyButton}</EuiFlexItem> : null}
          </EuiFlexGroup>
        </>
      ) : null}
      {isRevertOpen ? (
        <ConfirmModal
          title={i18n.REVERT_TITLE}
          body={
            <EuiText size="s">{agent ? i18n.REVERT_BODY_AGENT : i18n.REVERT_BODY_NONE}</EuiText>
          }
          confirmLabel={i18n.REVERT_CONFIRM}
          isLoading={isReverting}
          onCancel={() => setIsRevertOpen(false)}
          onConfirm={() => {
            updateRecord({ analyst_verdict: null });
            setIsRevertOpen(false);
          }}
          data-test-subj="investigationRevertVerdictModal"
        />
      ) : null}
      {flyout}
    </OverviewCard>
  );
};
AnalystVerdictView.displayName = 'AnalystVerdictView';

const AgentVerdictView: React.FC<
  VerdictViewProps & { agent: AgentVerdict; flyout: React.ReactNode }
> = ({ record, agent, isClosed, whyButton, flyout, onOpenModal, onNavigateTab }) => {
  const { euiTheme } = useEuiTheme();
  const alternatives = useMemo(() => agent.alternatives ?? [], [agent]);
  const alternativeRefs = useMemo(
    () => alternatives.flatMap(({ evidence }) => evidence ?? []),
    [alternatives]
  );
  const { byRef } = useEvidenceByRefs(record.id, alternativeRefs);

  return (
    <OverviewCard
      title={i18n.VERDICT_FROM_AGENT}
      iconType={ICONS.verdict}
      tone="highlight"
      data-test-subj="investigationVerdictCard"
    >
      <EuiFlexGroup
        gutterSize="m"
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        wrap
      >
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3 data-test-subj="investigationVerdictValue">{agent.label}</h3>
          </EuiTitle>
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            responsive={false}
            wrap
            css={css`
              margin-block-start: ${euiTheme.size.xs};
            `}
          >
            <EuiFlexItem
              grow={false}
              css={css`
                inline-size: 12rem;
              `}
            >
              <EuiProgress
                value={agent.confidence}
                max={100}
                size="m"
                color="primary"
                aria-label={i18n.CONFIDENCE_ARIA(agent.confidence)}
                data-test-subj="investigationVerdictConfidence"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" data-test-subj="investigationVerdictConfidenceText">
                <strong>{`${agent.confidence}%`}</strong> {i18n.CONFIDENCE}
              </EuiText>
            </EuiFlexItem>
            {whyButton ? <EuiFlexItem grow={false}>{whyButton}</EuiFlexItem> : null}
          </EuiFlexGroup>
        </EuiFlexItem>
        {!isClosed ? (
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={() => onOpenModal('determination')}
              data-test-subj="investigationVerdictSet"
            >
              {i18n.SET_YOUR_DETERMINATION}
            </EuiButton>
            <EuiText size="xs" color="subdued">
              {i18n.REPLACES_AGENT_VERDICT}
            </EuiText>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {alternatives.length > 0 ? (
        <>
          <EuiSpacer size="m" />
          <EuiPanel
            color="plain"
            hasBorder
            hasShadow={false}
            paddingSize="s"
            data-test-subj="investigationVerdictAlternatives"
          >
            <EuiText
              size="xs"
              color="subdued"
              css={css`
                text-transform: uppercase;
                font-weight: ${euiTheme.font.weight.semiBold};
                letter-spacing: 0.04em;
              `}
            >
              {i18n.ALTERNATIVES_CONSIDERED}
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiFlexGroup direction="column" gutterSize="s">
              {alternatives.map((alternative) => (
                <EuiFlexItem key={`${alternative.headline}-${alternative.badge}`}>
                  <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color={ALTERNATIVE_COLORS[alternative.badge]}>
                        {ALTERNATIVE_LABELS[alternative.badge]}
                      </EuiBadge>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <strong>{alternative.headline}</strong> {alternative.text}
                      </EuiText>
                      <EvidenceCites
                        refs={alternative.evidence ?? []}
                        byRef={byRef}
                        onOpenEvidence={(itemId) => onNavigateTab('evidence', { itemId })}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiPanel>
        </>
      ) : null}
      {flyout}
    </OverviewCard>
  );
};
AgentVerdictView.displayName = 'AgentVerdictView';

export interface VerdictCardProps {
  record: InvestigationRecord;
  onNavigateTab: (tab: TabId, opts?: { itemId?: string }) => void;
  onOpenModal: (name: ModalName) => void;
}

/** The current verdict: none yet, the agent verdict, or the analyst determination. */
export const VerdictCard: React.FC<VerdictCardProps> = ({ record, onNavigateTab, onOpenModal }) => {
  const agent = record.agent_verdict ?? null;
  const analyst = record.analyst_verdict ?? null;
  const isClosed = record.status === 'closed';
  const [isWhyOpen, setIsWhyOpen] = useState(false);
  const argument = useMemo(
    () => (agent?.argument ? normalizeArgument(agent.argument) : null),
    [agent]
  );

  const whyButton = argument ? (
    <WhyButton
      strength={argument.strength}
      evidenceCount={countArgumentEvidence(argument)}
      subject={claimsI18n.SUBJECT_VERDICT}
      onClick={() => setIsWhyOpen(true)}
      data-test-subj="investigationVerdictWhy"
    />
  ) : null;

  const flyout =
    isWhyOpen && argument ? (
      <ArgumentFlyout
        record={record}
        argument={argument}
        title={analyst ? i18n.VERDICT_SUPERSEDED : i18n.VERDICT}
        onClose={() => setIsWhyOpen(false)}
        onNavigateTab={onNavigateTab}
        notice={
          analyst ? (
            <EuiCallOut
              announceOnMount={false}
              size="s"
              color="warning"
              iconType={ICONS.warning}
              title={i18n.SUPERSEDED_NOTICE(VERDICT_LABELS[analyst.verdict])}
            />
          ) : undefined
        }
        footer={
          isClosed ? undefined : (
            <EuiButton
              fill
              onClick={() => {
                setIsWhyOpen(false);
                onOpenModal('determination');
              }}
              data-test-subj="investigationVerdictFlyoutSet"
            >
              {analyst ? i18n.EDIT_YOUR_DETERMINATION : i18n.SET_YOUR_DETERMINATION}
            </EuiButton>
          )
        }
      />
    ) : null;

  const shared = { record, isClosed, whyButton, onOpenModal, onNavigateTab };

  if (analyst) {
    return <AnalystVerdictView {...shared} analyst={analyst} agent={agent} flyout={flyout} />;
  }
  if (agent) {
    return <AgentVerdictView {...shared} agent={agent} flyout={flyout} />;
  }
  return <NoVerdictView isClosed={isClosed} onOpenModal={onOpenModal} />;
};
VerdictCard.displayName = 'VerdictCard';
