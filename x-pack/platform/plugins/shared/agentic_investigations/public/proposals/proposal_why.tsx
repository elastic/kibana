/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { parseProposalComment, type ProposalWhy } from '../../common/proposals/proposal_why';
import type { Hypothesis, HypothesisUnknown } from '../../common/hypotheses/hypotheses';
import { EventMarkdown, useEventLinks } from '../event_links/event_markdown';
import { useInvestigation } from '../investigations/hooks/use_investigation';
import { BlindSpotDetail, HypothesisDetail } from '../hypotheses/attachments/hypotheses_view';
import { HYPOTHESIS_STATUS_LABELS } from '../hypotheses/attachments/translations';
import {
  EventChartAndSource,
  EventKindBadge,
} from '../conversation_templates/templates/investigation/flyout/impact_map_events';

/** Wide enough that the three sections read without scrolling sideways or far down. */
const PROPOSAL_MODAL_WIDTH = 900;

const WHAT_LABEL = i18n.translate('xpack.agenticInvestigations.proposals.whatToDo', {
  defaultMessage: 'What to do',
});
const HOW_LABEL = i18n.translate('xpack.agenticInvestigations.proposals.how', {
  defaultMessage: 'How',
});
const WHY_LABEL = i18n.translate('xpack.agenticInvestigations.proposals.why', {
  defaultMessage: 'Why',
});
const CONFIRMED_HYPOTHESIS_GROUP = i18n.translate(
  'xpack.agenticInvestigations.proposals.confirmedHypothesisGroup',
  { defaultMessage: 'Confirmed hypothesis' }
);
const EVENT_GROUP = i18n.translate('xpack.agenticInvestigations.proposals.eventGroup', {
  defaultMessage: 'Event',
});
const BLIND_SPOT_GROUP = i18n.translate('xpack.agenticInvestigations.proposals.blindSpotGroup', {
  defaultMessage: 'Blind spot',
});

const summaryLabel = (hypotheses: number, events: number, hasBlindSpot: boolean): string =>
  i18n.translate('xpack.agenticInvestigations.proposals.summary', {
    defaultMessage:
      'Backed by {hypotheses, plural, =0 {} one {# confirmed hypothesis} other {# confirmed hypotheses}}{both, select, true { and } other {}}{events, plural, =0 {} one {# event} other {# events}}{blindSpot, select, true {, and it closes a blind spot} other {}}. Open one to see its evidence in Kibana.',
    values: {
      hypotheses,
      events,
      both: hypotheses > 0 && events > 0 ? 'true' : 'false',
      blindSpot: hasBlindSpot ? 'true' : 'false',
    },
  });

/** A titled section the reader can fold away, open to begin with. */
const ProposalSection = ({
  label,
  testSubject,
  children,
}: {
  label: string;
  testSubject: string;
  children: React.ReactNode;
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'proposalSection' });
  return (
    <EuiAccordion
      id={accordionId}
      initialIsOpen
      paddingSize="s"
      data-test-subj={testSubject}
      buttonContent={
        <EuiTitle size="xs">
          <h3>{label}</h3>
        </EuiTitle>
      }
    >
      <div
        css={css`
          /* The same close spacing as "What to do": short paragraphs, not prose. */
          p {
            margin-block-end: 8px;
          }
          .euiCodeBlock {
            margin-block-end: 0;
          }
        `}
      >
        {children}
      </div>
    </EuiAccordion>
  );
};

const GroupLabel = ({ children }: { children: React.ReactNode }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiText
      size="xs"
      color="subdued"
      css={css`
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-weight: ${euiTheme.font.weight.bold};
        margin-top: ${euiTheme.size.m};
      `}
    >
      {children}
    </EuiText>
  );
};

/** One collapsed row: a title with what it is, opening to what supports the action. */
const WhyRow = ({
  icon,
  title,
  badge,
  testSubject,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  testSubject: string;
  children: React.ReactNode;
}) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'proposalWhyRow' });
  return (
    <EuiAccordion
      id={accordionId}
      arrowDisplay="left"
      paddingSize="s"
      data-test-subj={testSubject}
      css={css`
        border-bottom: ${euiTheme.border.thin};
      `}
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">{title}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      extraAction={badge}
    >
      {children}
    </EuiAccordion>
  );
};

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const ProposalWhyList = ({
  conversationId,
  why,
}: {
  conversationId: string;
  why: ProposalWhy;
}) => {
  const links = useEventLinks();
  const { data } = useInvestigation(conversationId);
  const allHypotheses: Hypothesis[] = data?.hypotheses?.hypotheses ?? [];
  const allEvents = links?.impactMap.events ?? data?.impact_map?.events ?? [];

  const hypotheses = useMemo(
    () =>
      (why.hypotheses ?? [])
        .map((name) => allHypotheses.find(({ candidate }) => sameName(candidate, name)))
        // Only a confirmed hypothesis backs an action here; one still being tested does not.
        .filter(
          (hypothesis): hypothesis is Hypothesis =>
            hypothesis !== undefined && hypothesis.status === 'confirmed'
        ),
    [allHypotheses, why.hypotheses]
  );
  const events = useMemo(
    () =>
      (why.event_ids ?? [])
        .map((id) => allEvents.find((event) => event.id === id))
        .filter((event): event is NonNullable<typeof event> => event !== undefined),
    [allEvents, why.event_ids]
  );
  // The hypothesis whose blind spot this action closes, and which of its blind spots it is.
  const blindSpot = useMemo(() => {
    if (!why.blind_spot) return undefined;
    for (const hypothesis of allHypotheses) {
      const index = (hypothesis.unknowns ?? []).findIndex((unknown) =>
        sameName(typeof unknown === 'string' ? unknown : unknown.text, why.blind_spot as string)
      );
      if (index >= 0) return (hypothesis.unknowns ?? [])[index] as HypothesisUnknown;
    }
    return undefined;
  }, [allHypotheses, why.blind_spot]);

  // A row the record does not hold is left out, not shown broken.
  if (hypotheses.length === 0 && events.length === 0 && !blindSpot) {
    return null;
  }
  const renderHypothesis = (hypothesis: Hypothesis, index: number) => (
    <WhyRow
      key={hypothesis.candidate}
      testSubject={`investigationProposalWhyHypothesis-${index}`}
      icon={
        <EuiIcon
          type="checkCircleFill"
          color="success"
          aria-hidden
        />
      }
      title={hypothesis.candidate}
      badge={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color="success">
              {HYPOTHESIS_STATUS_LABELS[hypothesis.status]}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {Math.round(hypothesis.confidence * 100)}%
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <HypothesisDetail {...hypothesis} />
    </WhyRow>
  );

  return (
    <div data-test-subj="investigationProposalWhy">
      <ProposalSection label={WHY_LABEL} testSubject="investigationProposalWhySection">
      {/* The same size and formatting as "What to do", so the two read as one block of text. */}
      <EventMarkdown
        text={why.explanation ?? summaryLabel(hypotheses.length, events.length, Boolean(blindSpot))}
      />
      {hypotheses.length > 0 && (
        <>
          <GroupLabel>{CONFIRMED_HYPOTHESIS_GROUP}</GroupLabel>
          {hypotheses.map(renderHypothesis)}
        </>
      )}
      {events.length > 0 && (
        <>
          <GroupLabel>{EVENT_GROUP}</GroupLabel>
          {events.map((event, index) => (
            <WhyRow
              key={event.id}
              testSubject={`investigationProposalWhyEvent-${index}`}
              icon={<EuiIcon type="bullseye" color="subdued" aria-hidden />}
              title={event.title}
              badge={<EventKindBadge kind={event.kind} />}
            >
              {event.evidence?.chart || event.data_source ? (
                <EventChartAndSource event={event} allEvents={allEvents} />
              ) : (
                <EventMarkdown text={event.description ?? event.title} />
              )}
            </WhyRow>
          ))}
        </>
      )}
      {blindSpot && (
        <>
          <GroupLabel>{BLIND_SPOT_GROUP}</GroupLabel>
          <WhyRow
            testSubject="investigationProposalWhyBlindSpot"
            icon={<EuiIcon type="question" color="warning" aria-hidden />}
            title={typeof blindSpot === 'string' ? blindSpot : blindSpot.text}
          >
            <BlindSpotDetail unknown={blindSpot} />
          </WhyRow>
        </>
      )}
      </ProposalSection>
    </div>
  );
};

/**
 * The "What" heading and the "Why" list for a proposal, or nothing for one with no "why" in its
 * comment (an older proposal, or one from another producer), which then shows as it always did.
 */
export const getProposalWhyParts = (
  conversationId: string,
  comment: string
): { title: string; footer: React.ReactNode; modalWidth: number } | undefined => {
  const { why } = parseProposalComment(comment);
  if (!why) {
    return undefined;
  }
  return {
    title: WHAT_LABEL,
    modalWidth: PROPOSAL_MODAL_WIDTH,
    footer: (
      <>
        {why.how?.trim() && (
          <ProposalSection label={HOW_LABEL} testSubject="investigationProposalHow">
            <EventMarkdown text={why.how} />
          </ProposalSection>
        )}
        <ProposalWhyList conversationId={conversationId} why={why} />
      </>
    ),
  };
};
