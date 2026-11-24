/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPortal,
  EuiTitle,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type {
  Hypothesis,
  HypothesisCheck,
  HypothesisCheckOutcome,
  HypothesisUnknown,
  HypothesisStatus,
  InvestigationHypotheses,
} from '../../../common/hypotheses/hypotheses';
import { EventMarkdown, useEventLinks } from '../../event_links/event_markdown';
import { LinkedEventCard } from '../../event_links/linked_event_card';
import { EventChartAndSource } from '../../conversation_templates/templates/investigation/flyout/impact_map_events';
import { EvidenceView } from '../../evidence/evidence_view';
import { HYPOTHESIS_STATUS_LABELS, confidenceLabel } from './translations';
import type {
  InvestigationAttachmentContentProps,
  InvestigationAttachmentVariant,
} from '../../investigation_attachments';

const NO_HYPOTHESES = i18n.translate('xpack.agenticInvestigations.hypotheses.attachments.empty', {
  defaultMessage: 'No hypotheses recorded yet.',
});

const HYPOTHESIS_LABEL = i18n.translate('xpack.agenticInvestigations.hypotheses.candidateLabel', {
  defaultMessage: 'Hypothesis:',
});

const NO_REASON = i18n.translate('xpack.agenticInvestigations.hypotheses.noReason', {
  defaultMessage: 'No reasoning recorded yet.',
});

const HYPOTHESIS_STATUS_ICONS: Record<Exclude<HypothesisStatus, 'investigating'>, string> = {
  dismissed: 'dashedCircle',
  confirmed: 'checkCircle',
};

const confidenceBadgeLabel = (confidence: number): string =>
  i18n.translate('xpack.agenticInvestigations.hypotheses.confidenceBadge', {
    defaultMessage: '{confidence, number, percent}',
    values: { confidence },
  });

const HypothesisStatusIcon = ({ status }: { status: HypothesisStatus }) =>
  status === 'investigating' ? (
    <EuiLoadingSpinner
      size="s"
      aria-label={HYPOTHESIS_STATUS_LABELS[status]}
      data-test-subj={`investigationHypothesisStatus-${status}`}
    />
  ) : (
    <EuiIcon
      type={HYPOTHESIS_STATUS_ICONS[status]}
      color="text"
      title={HYPOTHESIS_STATUS_LABELS[status]}
      data-test-subj={`investigationHypothesisStatus-${status}`}
    />
  );

const TESTED_LABEL = i18n.translate('xpack.agenticInvestigations.hypotheses.testedLabel', {
  defaultMessage: 'Tested',
});
const RESULT_LABEL = i18n.translate('xpack.agenticInvestigations.hypotheses.resultLabel', {
  defaultMessage: 'Result',
});

const TESTED_AND_RESULT = /^\s*\**Tested:?\**:?\s*([\s\S]*?)\s*\**Result:?\**:?\s*([\s\S]*?)\s*$/i;

/** The recorder writes a reason as "Tested: …" then "Result: …"; anything else stays whole. */
export const splitReason = (reason: string): { tested: string; result: string } | undefined => {
  const match = TESTED_AND_RESULT.exec(reason.replace(/\\n/g, '\n'));
  return match && match[1] && match[2] ? { tested: match[1], result: match[2] } : undefined;
};

const ReasonSection = ({
  label,
  testSubject,
  children,
}: {
  label: string;
  testSubject: string;
  children: React.ReactNode;
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationHypothesisSection' });
  return (
    <EuiAccordion
      id={accordionId}
      initialIsOpen
      paddingSize="s"
      data-test-subj={testSubject}
      buttonContent={
        <EuiText size="s">
          <strong>{label}</strong>
        </EuiText>
      }
    >
      {children}
    </EuiAccordion>
  );
};

const WHY_LABEL = i18n.translate('xpack.agenticInvestigations.hypotheses.whyLabel', {
  defaultMessage: 'Why',
});
const DATA_LABEL = i18n.translate('xpack.agenticInvestigations.hypotheses.dataLabel', {
  defaultMessage: 'What the data shows',
});
const HOW_TESTED_LABEL = i18n.translate('xpack.agenticInvestigations.hypotheses.howTestedLabel', {
  defaultMessage: 'How it was tested',
});
const BLIND_SPOTS_LABEL = i18n.translate('xpack.agenticInvestigations.hypotheses.blindSpotsLabel', {
  defaultMessage: 'Blind spots',
});

const CHECK_OUTCOMES: Record<
  HypothesisCheckOutcome,
  { icon: string; color: string; label: string }
> = {
  supported: {
    icon: 'checkCircleFill',
    color: 'success',
    label: i18n.translate('xpack.agenticInvestigations.hypotheses.check.supported', {
      defaultMessage: 'Supports this cause',
    }),
  },
  contradicted: {
    icon: 'errorFill',
    color: 'danger',
    label: i18n.translate('xpack.agenticInvestigations.hypotheses.check.contradicted', {
      defaultMessage: 'Points away from this cause',
    }),
  },
  not_tested: {
    icon: 'minusCircle',
    color: 'subdued',
    label: i18n.translate('xpack.agenticInvestigations.hypotheses.check.notTested', {
      defaultMessage: 'Not tested',
    }),
  },
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiText
      size="xs"
      color="subdued"
      css={css`
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-weight: ${euiTheme.font.weight.bold};
      `}
    >
      {children}
    </EuiText>
  );
};

const OPEN_LABEL = i18n.translate('xpack.agenticInvestigations.hypotheses.openDetail', {
  defaultMessage: 'Show details',
});
const EXPECTED_LABEL = i18n.translate('xpack.agenticInvestigations.hypotheses.expectedLabel', {
  defaultMessage: 'What we expected',
});
const FOUND_LABEL = i18n.translate('xpack.agenticInvestigations.hypotheses.foundLabel', {
  defaultMessage: 'What we found',
});
const RESULT_CHART_LABEL = i18n.translate('xpack.agenticInvestigations.hypotheses.resultChart', {
  defaultMessage: 'The result',
});
const DETAIL_LABEL = i18n.translate('xpack.agenticInvestigations.hypotheses.detailLabel', {
  defaultMessage: 'Details',
});
const EFFECT_LABEL = i18n.translate('xpack.agenticInvestigations.hypotheses.effectLabel', {
  defaultMessage: 'How it affects confidence',
});
const WHERE_TO_LOOK_LABEL = i18n.translate('xpack.agenticInvestigations.hypotheses.whereToLook', {
  defaultMessage: 'Where to look',
});
const HOW_TO_CLOSE_LABEL = i18n.translate('xpack.agenticInvestigations.hypotheses.howToClose', {
  defaultMessage: 'How to close the gap',
});

/** A blind spot as parts; one saved as a bare string has only its text. */
const toUnknownParts = (unknown: HypothesisUnknown) =>
  typeof unknown === 'string' ? { text: unknown } : unknown;

/** A whole row that opens a detail flyout, so the scan list stays short. */
const OpenableRow = ({
  onOpen,
  testSubject,
  children,
}: {
  onOpen: () => void;
  testSubject: string;
  children: React.ReactNode;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={OPEN_LABEL}
      data-test-subj={testSubject}
      css={css`
        display: block;
        width: 100%;
        padding: ${euiTheme.size.s} 0;
        border: none;
        border-bottom: ${euiTheme.border.thin};
        background: none;
        text-align: start;
        cursor: pointer;
        color: inherit;
        font: inherit;
        &:hover {
          background-color: ${euiTheme.colors.backgroundBaseSubdued};
        }
        &:last-child {
          border-bottom: none;
        }
      `}
    >
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        {children}
        <EuiFlexItem grow={false}>
          <EuiIcon type="chevronSingleRight" color="subdued" aria-hidden />
        </EuiFlexItem>
      </EuiFlexGroup>
    </button>
  );
};

/**
 * One row to scan: what was expected if this is the cause, then what was found, with a mark
 * for whether the result supports the cause, points away from it, or was not tested.
 */
const CheckRow = ({ check, onOpen }: { check: HypothesisCheck; onOpen: () => void }) => {
  const outcome = CHECK_OUTCOMES[check.outcome];
  return (
    <OpenableRow onOpen={onOpen} testSubject={`investigationHypothesisCheck-${check.outcome}`}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={outcome.icon} color={outcome.color} title={outcome.label} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s">
          <EventMarkdown text={check.expected} />
        </EuiText>
        <EuiText size="s" color="subdued">
          <EventMarkdown text={check.found} />
        </EuiText>
      </EuiFlexItem>
    </OpenableRow>
  );
};

const FlyoutSection = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <>
    <SectionLabel>{label}</SectionLabel>
    <EuiSpacer size="xs" />
    {children}
    <EuiSpacer size="l" />
  </>
);

type OpenDetail = { kind: 'check'; index: number } | { kind: 'unknown'; index: number };

/**
 * The detail of one check or blind spot, in a child flyout over the hypothesis panel: a check
 * shows what was expected and found, its detail and its chart; a blind spot shows how it affects
 * confidence, where to look and how to close the gap.
 */
const EVENT_LINK = /\]\(event:([^)\s]*)\)/;

const HypothesisDetailFlyout = ({
  open,
  checks,
  unknowns,
  reason,
  onClose,
}: {
  open: OpenDetail;
  checks: HypothesisCheck[];
  unknowns: HypothesisUnknown[];
  /** The hypothesis's own reason: its linked event backs a check that links none. */
  reason?: string;
  onClose: () => void;
}) => {
  const links = useEventLinks();
  const titleId = useGeneratedHtmlId({ prefix: 'investigationHypothesisDetailTitle' });
  const check = open.kind === 'check' ? checks[open.index] : undefined;
  const unknown = open.kind === 'unknown' ? unknowns[open.index] : undefined;
  if (!check && unknown === undefined) {
    return null;
  }
  const parts = unknown !== undefined ? toUnknownParts(unknown) : undefined;
  // The event a check's own text links, else the one its hypothesis's reason links.
  const eventId = check
    ? [check.found, check.detail, check.expected, reason]
        .map((text) => (text ? EVENT_LINK.exec(text.replace(/\\n/g, '\n'))?.[1] : undefined))
        .find(Boolean)
    : undefined;
  const allEvents = links?.impactMap.events;
  const linkedEvent = eventId ? allEvents?.find(({ id }) => id === eventId) : undefined;
  const title = check?.expected ?? parts?.text ?? '';
  return (
    // Rendered from inside a flyout whose transformed body would otherwise contain this one.
    <EuiPortal>
      <EuiFlyout
        onClose={onClose}
        aria-labelledby={titleId}
        data-test-subj="investigationHypothesisDetailFlyout"
        session="inherit"
        flyoutMenuProps={{ title, hideTitle: true }}
        type="push"
        size="s"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id={titleId}>{title}</h2>
          </EuiTitle>
          {check && (
            <>
              <EuiSpacer size="xs" />
              <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    type={CHECK_OUTCOMES[check.outcome].icon}
                    color={CHECK_OUTCOMES[check.outcome].color}
                    aria-hidden
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    {CHECK_OUTCOMES[check.outcome].label}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {check && (
            <>
              <FlyoutSection label={EXPECTED_LABEL}>
                <EuiText size="s">
                  <EventMarkdown text={check.expected} />
                </EuiText>
              </FlyoutSection>
              <FlyoutSection label={FOUND_LABEL}>
                <EuiText size="s">
                  <EventMarkdown text={check.found} />
                </EuiText>
              </FlyoutSection>
              {linkedEvent && (
                <FlyoutSection label={RESULT_CHART_LABEL}>
                  <EventChartAndSource event={linkedEvent} allEvents={allEvents} />
                </FlyoutSection>
              )}
              {check.detail?.trim() && (
                <FlyoutSection label={DETAIL_LABEL}>
                  <EuiText size="s">
                    <EventMarkdown text={check.detail} />
                  </EuiText>
                </FlyoutSection>
              )}
            </>
          )}
          {parts && (
            <>
              {parts.effect && (
                <FlyoutSection label={EFFECT_LABEL}>
                  <EuiText size="s">
                    <EventMarkdown text={parts.effect} />
                  </EuiText>
                </FlyoutSection>
              )}
              {parts.where_to_look && (
                <FlyoutSection label={WHERE_TO_LOOK_LABEL}>
                  <EuiText size="s">
                    <EventMarkdown text={parts.where_to_look} />
                  </EuiText>
                </FlyoutSection>
              )}
              {parts.how_to_close && (
                <FlyoutSection label={HOW_TO_CLOSE_LABEL}>
                  <EuiText size="s">
                    <EventMarkdown text={parts.how_to_close} />
                  </EuiText>
                </FlyoutSection>
              )}
            </>
          )}
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
};

/**
 * A hypothesis's detail. A card the recorder filled in with a one-line reason leads with that
 * line, then the chart that tells the story with its caveat, then each check as a row, then
 * the blind spots. Older cards keep their Tested / Result reason, with the charts after it.
 */
export const HypothesisDetail = ({
  reason,
  evidence,
  why,
  checks,
  unknowns,
  chart_note: chartNote,
}: Pick<
  Hypothesis,
  'reason' | 'evidence' | 'why' | 'checks' | 'unknowns' | 'chart_note'
>): React.ReactElement => {
  const [open, setOpen] = useState<OpenDetail | null>(null);
  const sections = reason?.trim() ? splitReason(reason) : undefined;
  const charts = evidence?.map((item, index) => (
    <React.Fragment key={index}>
      <EuiSpacer size="s" />
      <EvidenceView evidence={item} />
    </React.Fragment>
  ));
  const hasStructure = Boolean(why?.trim()) || Boolean(checks?.length) || Boolean(unknowns?.length);
  if (hasStructure) {
    return (
      <div data-test-subj="investigationHypothesisReason">
        {why?.trim() && (
          <>
            <SectionLabel>{WHY_LABEL}</SectionLabel>
            <EuiSpacer size="xs" />
            <EuiText size="m" data-test-subj="investigationHypothesisWhy">
              <EventMarkdown text={why} />
            </EuiText>
            <EuiSpacer size="m" />
          </>
        )}
        {Boolean(evidence?.length) && (
          <>
            <SectionLabel>{DATA_LABEL}</SectionLabel>
            {charts}
            {chartNote?.trim() && (
              <>
                <EuiSpacer size="xs" />
                <EuiText size="xs" color="subdued" data-test-subj="investigationHypothesisChartNote">
                  <p>{chartNote}</p>
                </EuiText>
              </>
            )}
            <EuiSpacer size="m" />
          </>
        )}
        {Boolean(checks?.length) && (
          <div data-test-subj="investigationHypothesisChecks">
            <SectionLabel>{HOW_TESTED_LABEL}</SectionLabel>
            <EuiSpacer size="xs" />
            {checks?.map((check, index) => (
              <CheckRow
                key={index}
                check={check}
                onOpen={() => setOpen({ kind: 'check', index })}
              />
            ))}
            <EuiSpacer size="m" />
          </div>
        )}
        {Boolean(unknowns?.length) && (
          <div data-test-subj="investigationHypothesisBlindSpots">
            <SectionLabel>{BLIND_SPOTS_LABEL}</SectionLabel>
            <EuiSpacer size="xs" />
            {unknowns?.map((unknown, index) => (
              <OpenableRow
                key={index}
                onOpen={() => setOpen({ kind: 'unknown', index })}
                testSubject="investigationHypothesisBlindSpot"
              >
                <EuiFlexItem grow={false}>
                  <EuiIcon type="question" color="warning" aria-hidden />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">
                    <EventMarkdown text={toUnknownParts(unknown).text} />
                  </EuiText>
                </EuiFlexItem>
              </OpenableRow>
            ))}
          </div>
        )}
        {open && (
          <HypothesisDetailFlyout
            open={open}
            checks={checks ?? []}
            unknowns={unknowns ?? []}
            reason={reason}
            onClose={() => setOpen(null)}
          />
        )}
      </div>
    );
  }
  if (sections) {
    const resultCard = <LinkedEventCard text={sections.result} />;
    return (
      <div data-test-subj="investigationHypothesisReason">
        <ReasonSection label={TESTED_LABEL} testSubject="investigationHypothesisTested">
          <EventMarkdown text={sections.tested} />
        </ReasonSection>
        <EuiSpacer size="s" />
        <ReasonSection label={RESULT_LABEL} testSubject="investigationHypothesisResult">
          <EventMarkdown text={sections.result} />
          <EuiSpacer size="s" />
          {resultCard}
        </ReasonSection>
        {charts}
      </div>
    );
  }
  return (
    <>
      <div data-test-subj="investigationHypothesisReason">
        {reason?.trim() ? (
          <EventMarkdown text={reason} />
        ) : (
          <EuiText size="s" color="subdued">
            <p>{NO_REASON}</p>
          </EuiText>
        )}
      </div>
      {charts}
    </>
  );
};

const HypothesisItem = ({
  hypothesis: { candidate, confidence, status, evidence = [], ...detail },
  variant,
}: {
  hypothesis: Hypothesis;
  variant: InvestigationAttachmentVariant;
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationHypothesis' });
  return (
    <EuiAccordion
      id={accordionId}
      data-test-subj="investigationHypothesis"
      paddingSize="s"
      buttonProps={{ 'data-test-subj': 'investigationHypothesisToggle' }}
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <HypothesisStatusIcon status={status} />
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiText size="xs" color="text">
              <strong>{HYPOTHESIS_LABEL}</strong> <span>{candidate}</span>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      extraAction={
        <EuiBadge
          color={status === 'confirmed' ? 'success' : 'hollow'}
          title={confidenceLabel(confidence)}
          data-test-subj="investigationHypothesisConfidence"
        >
          {confidenceBadgeLabel(confidence)}
        </EuiBadge>
      }
    >
      <HypothesisDetail {...detail} evidence={variant === 'details' ? evidence : []} />
    </EuiAccordion>
  );
};

/**
 * The hypotheses an investigation considered, in the order the agent reported them: one collapsed
 * row each with its status and confidence, expanding to its reason. The details flyout also shows
 * each hypothesis's evidence when expanded; the inline chat render leaves it out to stay compact.
 */
export const HypothesesList: React.FC<{
  hypotheses: Hypothesis[];
  variant: InvestigationAttachmentVariant;
}> = ({ hypotheses, variant }) => {
  if (hypotheses.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="investigationHypothesesEmpty">
        {NO_HYPOTHESES}
      </EuiText>
    );
  }
  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="investigationHypotheses">
      {hypotheses.map((hypothesis, index) => (
        <EuiFlexItem grow={false} key={index}>
          <HypothesisItem hypothesis={hypothesis} variant={variant} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

export const HypothesesView: React.FC<
  InvestigationAttachmentContentProps<InvestigationHypotheses>
> = ({ document: { hypotheses }, variant }) => (
  <HypothesesList hypotheses={hypotheses} variant={variant} />
);
