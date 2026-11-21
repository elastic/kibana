/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAvatar,
  EuiBadge,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTimeline,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { Argument, EvidenceItem } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { isOpenStrength } from './claim_utils';
import { EvidenceCites } from './evidence_cites';
import * as i18n from './translations';

export interface ArgumentViewProps {
  argument: Argument;
  byRef: ReadonlyMap<string, EvidenceItem>;
  onOpenEvidence: (itemId: string) => void;
}

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiText
    size="xs"
    color="subdued"
    css={css`
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.04em;
    `}
  >
    {children}
  </EuiText>
);
SectionLabel.displayName = 'SectionLabel';

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    <EuiTitle size="xxs">
      <h3>{children}</h3>
    </EuiTitle>
    <EuiSpacer size="s" />
  </>
);
SectionTitle.displayName = 'SectionTitle';

const SourceTag: React.FC<{ source: string }> = ({ source }) =>
  source ? <EuiBadge color="hollow">{source}</EuiBadge> : null;
SourceTag.displayName = 'SourceTag';

const WeightDots: React.FC<{ weight: number }> = ({ weight }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <span
      role="img"
      aria-label={i18n.WEIGHT_ARIA(weight)}
      title={i18n.WEIGHT_ARIA(weight)}
      css={css`
        display: inline-flex;
        gap: ${euiTheme.size.xxs};
        align-items: center;
      `}
      data-test-subj="investigationWeightDots"
    >
      {[1, 2, 3].map((dot) => (
        <i
          key={dot}
          css={css`
            display: inline-block;
            inline-size: ${euiTheme.size.s};
            block-size: ${euiTheme.size.s};
            border-radius: 50%;
            background-color: ${dot <= weight
              ? euiTheme.colors.backgroundFilledPrimary
              : euiTheme.colors.borderBasePlain};
          `}
        />
      ))}
    </span>
  );
};
WeightDots.displayName = 'WeightDots';

const StepNumber: React.FC<{ label: string; position: number }> = ({ label, position }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiAvatar
      name={label}
      initials={String(position)}
      size="s"
      color={euiTheme.colors.backgroundFilledPrimary}
    />
  );
};
StepNumber.displayName = 'StepNumber';

const Rebuttals: React.FC<ArgumentViewProps> = ({ argument, byRef, onOpenEvidence }) => {
  if (argument.rebuttals.length === 0) {
    return null;
  }
  const statusLabels = {
    rejected: { label: i18n.REBUTTAL_RULED_OUT, color: 'hollow' },
    weakened: { label: i18n.REBUTTAL_WEAKENED, color: 'warning' },
    open: { label: i18n.REBUTTAL_OPEN, color: 'danger' },
  } as const;

  return (
    <div data-test-subj="investigationArgumentRebuttals">
      <SectionTitle>{i18n.COUNTERARGUMENTS}</SectionTitle>
      <EuiFlexGroup direction="column" gutterSize="s">
        {argument.rebuttals.map((rebuttal) => {
          const status = statusLabels[rebuttal.status];
          return (
            <EuiFlexItem key={rebuttal.text}>
              <EuiPanel hasBorder hasShadow={false} paddingSize="s">
                <EuiFlexGroup
                  justifyContent="spaceBetween"
                  alignItems="flexStart"
                  gutterSize="s"
                  responsive={false}
                >
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>{i18n.UNLESS(rebuttal.text)}</strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={status.color}>{status.label}</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiText size="xs" color="subdued">
                  {rebuttal.response}
                </EuiText>
                <EvidenceCites
                  refs={rebuttal.evidence}
                  byRef={byRef}
                  onOpenEvidence={onOpenEvidence}
                />
              </EuiPanel>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </div>
  );
};
Rebuttals.displayName = 'Rebuttals';

/** Grounds, then reasoning steps, the warrant, and the conclusion, read top to bottom. */
export const ChainView: React.FC<ArgumentViewProps> = (props) => {
  const { argument, byRef, onOpenEvidence } = props;
  const { euiTheme } = useEuiTheme();
  const open = isOpenStrength(argument.strength);

  const items = [
    ...(argument.steps.length === 0
      ? [
          {
            icon: <EuiIcon type={ICONS.question} color="warning" aria-hidden="true" />,
            children: (
              <EuiPanel color="warning" hasShadow={false} paddingSize="s">
                <SectionLabel>{i18n.NO_REASONING_TITLE}</SectionLabel>
                <EuiText size="s">{i18n.NO_REASONING_BODY(argument.grounds.length)}</EuiText>
              </EuiPanel>
            ),
          },
        ]
      : argument.steps.map((step, index) => ({
          icon: <StepNumber label={i18n.STEP_ARIA(index + 1)} position={index + 1} />,
          children: (
            <>
              <EuiPanel hasBorder hasShadow={false} paddingSize="s">
                <SectionLabel>{i18n.OBSERVED}</SectionLabel>
                <EuiText size="s">{step.text}</EuiText>
                <EuiSpacer size="xs" />
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
                  <EuiFlexItem grow={false}>
                    <EvidenceCites
                      refs={step.evidence}
                      byRef={byRef}
                      onOpenEvidence={onOpenEvidence}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <SourceTag source={step.source} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
              <EuiPanel
                color="primary"
                hasShadow={false}
                paddingSize="s"
                css={css`
                  margin-block-start: ${euiTheme.size.xs};
                `}
              >
                <SectionLabel>{i18n.SO}</SectionLabel>
                <EuiText size="s">{step.so}</EuiText>
              </EuiPanel>
            </>
          ),
        }))),
    ...(argument.warrant
      ? [
          {
            icon: <EuiIcon type={ICONS.report} aria-hidden="true" />,
            children: (
              <EuiPanel hasBorder hasShadow={false} paddingSize="s">
                <SectionLabel>{i18n.BECAUSE_RULE}</SectionLabel>
                <EuiText size="s">{argument.warrant.rule}</EuiText>
                <EuiText size="xs" color="subdued">
                  {argument.warrant.backing}
                </EuiText>
              </EuiPanel>
            ),
          },
        ]
      : []),
    {
      icon: open ? (
        <EuiIcon type={ICONS.question} color="warning" aria-hidden="true" />
      ) : (
        <EuiIcon type={ICONS.verdict} color="success" aria-hidden="true" />
      ),
      children: (
        <EuiPanel color={open ? 'warning' : 'success'} hasShadow={false} paddingSize="s">
          <SectionLabel>{open ? i18n.CURRENT_POSITION : i18n.CONCLUSION}</SectionLabel>
          <EuiText size="s">
            <strong>{argument.claim}</strong>
          </EuiText>
        </EuiPanel>
      ),
    },
  ];

  return (
    <div data-test-subj="investigationArgumentChain">
      <EuiTimeline items={items} gutterSize="m" />
      <EuiSpacer size="m" />
      <Rebuttals {...props} />
      {argument.gaps.length > 0 ? (
        <>
          <EuiSpacer size="m" />
          <SectionTitle>{i18n.COULD_NOT_ESTABLISH}</SectionTitle>
          <EuiFlexGroup direction="column" gutterSize="s">
            {argument.gaps.map((gap) => (
              <EuiFlexItem key={gap.text}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">{gap.text}</EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="warning">{gap.why}</EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EvidenceCites
                      refs={gap.evidence}
                      byRef={byRef}
                      onOpenEvidence={onOpenEvidence}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      ) : null}
    </div>
  );
};
ChainView.displayName = 'ChainView';

/** Grounds on one side, the claim on the other, with the rule between them and the rebuttals. */
export const MapView: React.FC<ArgumentViewProps> = (props) => {
  const { argument, byRef, onOpenEvidence } = props;
  const open = isOpenStrength(argument.strength);

  return (
    <div data-test-subj="investigationArgumentMap">
      <EuiFlexGrid columns={2} gutterSize="m">
        <EuiFlexItem>
          <SectionLabel>{i18n.GROUNDS}</SectionLabel>
          <EuiSpacer size="xs" />
          <EuiFlexGroup direction="column" gutterSize="s">
            {argument.grounds.length === 0 ? (
              <EuiFlexItem>
                <EuiText size="s" color="subdued">
                  {i18n.NO_GROUNDS}
                </EuiText>
              </EuiFlexItem>
            ) : (
              argument.grounds.map((ground) => (
                <EuiFlexItem key={`${ground.text}-${ground.evidence.join(',')}`}>
                  <EuiPanel hasBorder hasShadow={false} paddingSize="s">
                    <EuiText size="s">{ground.text}</EuiText>
                    <EuiSpacer size="xs" />
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                      <EuiFlexItem grow={false}>
                        <EvidenceCites
                          refs={ground.evidence}
                          byRef={byRef}
                          onOpenEvidence={onOpenEvidence}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <SourceTag source={ground.source} />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <WeightDots weight={ground.weight} />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                </EuiFlexItem>
              ))
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <SectionLabel>{i18n.CLAIM}</SectionLabel>
          <EuiSpacer size="xs" />
          <EuiPanel color={open ? 'warning' : 'success'} hasShadow={false} paddingSize="s">
            <EuiText size="s">
              <strong>{argument.claim}</strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiBadge color={open ? 'warning' : 'success'}>
              {argument.confidence !== null
                ? i18n.PROBABLY(argument.confidence)
                : argument.strength}
            </EuiBadge>
            <EuiText size="xs" color="subdued">
              {argument.condition}
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
      <EuiSpacer size="m" />
      <EuiPanel
        hasBorder
        hasShadow={false}
        paddingSize="s"
        color={argument.warrant ? 'plain' : 'warning'}
      >
        <SectionLabel>{i18n.BECAUSE_WARRANT}</SectionLabel>
        {argument.warrant ? (
          <>
            <EuiText size="s">{argument.warrant.rule}</EuiText>
            <EuiText size="xs" color="subdued">
              {argument.warrant.backing}
            </EuiText>
          </>
        ) : (
          <EuiText size="s">{i18n.NO_WARRANT}</EuiText>
        )}
      </EuiPanel>
      <EuiSpacer size="m" />
      {argument.rebuttals.length > 0 ? (
        <Rebuttals {...props} />
      ) : (
        <>
          <SectionTitle>{i18n.UNLESS_REBUTTALS}</SectionTitle>
          <EuiText size="s" color="subdued">
            {i18n.NO_REBUTTALS}
          </EuiText>
        </>
      )}
    </div>
  );
};
MapView.displayName = 'MapView';

const sumWeights = (entries: ReadonlyArray<{ weight: number }>): number =>
  entries.reduce((total, { weight }) => total + weight, 0);

interface BalanceEntry {
  text: string;
  evidence: string[];
  weight: number;
  source?: string;
  why?: string;
}

const BalanceList: React.FC<
  ArgumentViewProps & { entries: BalanceEntry[]; empty: string; tone: string; testSubj: string }
> = ({ entries, empty, tone, testSubj, byRef, onOpenEvidence }) => {
  const { euiTheme } = useEuiTheme();

  if (entries.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        {empty}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj={testSubj}>
      {entries.map((entry) => (
        <EuiFlexItem key={`${entry.text}-${entry.evidence.join(',')}`}>
          <EuiPanel
            hasBorder
            hasShadow={false}
            paddingSize="s"
            css={css`
              border-inline-start: ${euiTheme.border.width.thick} solid ${tone};
            `}
          >
            <EuiText size="s">{entry.text}</EuiText>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EvidenceCites
                  refs={entry.evidence}
                  byRef={byRef}
                  onOpenEvidence={onOpenEvidence}
                />
              </EuiFlexItem>
              {entry.source ? (
                <EuiFlexItem grow={false}>
                  <SourceTag source={entry.source} />
                </EuiFlexItem>
              ) : null}
              {entry.why ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="warning">{entry.why}</EuiBadge>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <WeightDots weight={entry.weight} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
BalanceList.displayName = 'BalanceList';

/** Support, counter-evidence and unknowns weighed against each other. */
export const BalanceView: React.FC<ArgumentViewProps> = (props) => {
  const { argument } = props;
  const { euiTheme } = useEuiTheme();
  const support = sumWeights(argument.grounds);
  const counter = sumWeights(argument.against);
  const unknown = sumWeights(argument.gaps);
  const total = support + counter + unknown || 1;
  const supportColor = euiTheme.colors.backgroundFilledSuccess;
  const counterColor = euiTheme.colors.backgroundFilledDanger;
  const unknownColor = euiTheme.colors.backgroundFilledWarning;
  const segment = (color: string, weight: number) => css`
    display: block;
    inline-size: ${(weight / total) * 100}%;
    background-color: ${color};
  `;

  return (
    <div data-test-subj="investigationArgumentBalance">
      <div
        role="img"
        aria-label={i18n.BALANCE_ARIA(support, counter, unknown)}
        css={css`
          display: flex;
          block-size: ${euiTheme.size.s};
          border-radius: ${euiTheme.border.radius.small};
          overflow: hidden;
          background-color: ${euiTheme.colors.borderBasePlain};
        `}
      >
        <i css={segment(supportColor, support)} />
        <i css={segment(counterColor, counter)} />
        <i css={segment(unknownColor, unknown)} />
      </div>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="m" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">{i18n.BALANCE_SUPPORTS(support)}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">{i18n.BALANCE_COUNTERS(counter)}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">{i18n.BALANCE_UNKNOWN(unknown)}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <SectionTitle>{i18n.SUPPORTS_THE_CLAIM}</SectionTitle>
      <BalanceList
        {...props}
        entries={argument.grounds.map(({ text, evidence, weight, source }) => ({
          text,
          evidence,
          weight,
          source,
        }))}
        empty={i18n.NO_SUPPORT}
        tone={supportColor}
        testSubj="investigationBalanceSupports"
      />
      <EuiSpacer size="m" />
      <SectionTitle>{i18n.COUNTERS_THE_CLAIM}</SectionTitle>
      <BalanceList
        {...props}
        entries={argument.against}
        empty={i18n.NO_COUNTER_EVIDENCE}
        tone={counterColor}
        testSubj="investigationBalanceCounters"
      />
      <EuiSpacer size="m" />
      <SectionTitle>{i18n.UNKNOWN_COULD_CHANGE}</SectionTitle>
      <BalanceList
        {...props}
        entries={argument.gaps}
        empty={i18n.NOTHING_MISSING}
        tone={unknownColor}
        testSubj="investigationBalanceUnknown"
      />
    </div>
  );
};
BalanceView.displayName = 'BalanceView';
