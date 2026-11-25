/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import {
  EuiAccordion,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  OverviewTab,
  conversationToInvestigation,
  type OverviewSections,
  type ImpactEntityTarget,
  type OverviewSlotRenderProps,
} from '@kbn/agentic-investigations-common';
import type { Investigation, InvestigationImpactMapResponse } from '../../../../../common';
import { selectTimelineSummary } from '../../../../../common';
import { HypothesisTreeCard } from '../../../../hypotheses/tree/hypothesis_tree_card';
import {
  EventMarkdown,
  EventLinksProvider,
  useEventLinks,
} from '../../../../event_links/event_markdown';
import { EventCard, pickImpactEvents } from '../../../../impact_map/attachments/impact_map_cards';
import { SubjectList } from '../../../../subjects/attachments/subject_view';
import { useInvestigation } from '../../../../investigations/hooks/use_investigation';
import { getInvestigationDisplayTitle } from '../to_view_model';
import {
  TimelineSummaryCard,
  ViewFullTimelineButton,
} from '../../../../timeline/timeline_summary_card';
import {
  TimelineFlyoutHost,
  type OpenTimeline,
} from '../../../../timeline/use_timeline_flyout';

const readMetadataString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  // Text saved from a chat reply may carry the tag that renders an attachment in chat.
  const text = value.replace(/<render_attachment\b[^>]*\/?>/g, '').trim();
  return text.length > 0 ? text : undefined;
};

/** Sections for the data an investigation has; missing data leaves its section out. */
/** The summary timeline, opening an event as the rest of the overview does. */
const OverviewTimeline: React.FC<{ impactMap: InvestigationImpactMapResponse }> = ({
  impactMap,
}) => {
  const links = useEventLinks();
  return (
    <TimelineSummaryCard
      impactMap={impactMap}
      onOpenEvent={(eventId) => links?.openEvent(eventId)}
    />
  );
};

export const toOverviewSections = (
  investigation: Investigation | undefined,
  fallbackVerdict: string | undefined
): OverviewSections => {
  const subjects = investigation?.subjects ?? [];
  const impact = investigation?.impact;
  const impactMap = investigation?.impact_map;
  const hasImpact =
    impact !== undefined &&
    (Boolean(impact.summary?.trim()) || pickImpactEvents(impactMap?.events ?? []).length > 0);
  const hypotheses = investigation?.hypotheses?.hypotheses ?? [];
  const conclusion = readMetadataString(investigation?.metadata.verdict) ?? fallbackVerdict;

  return {
    subjects: subjects.length > 0 ? <SubjectList subjects={subjects} /> : undefined,
    impact: hasImpact ? (
      <CustomerImpact summary={impact?.summary} impactMap={impactMap} />
    ) : undefined,
    timeline:
      impactMap &&
      selectTimelineSummary({
        events: impactMap.events,
        relationships: impactMap.relationships,
        timeline: impactMap.timeline,
      }) ? (
        <OverviewTimeline impactMap={impactMap} />
      ) : undefined,
    timelineAction: impactMap ? <ViewFullTimelineButton /> : undefined,
    renderMarkdown: (text, options) => (
      <EventMarkdown text={text} color={options?.subdued ? 'subdued' : undefined} />
    ),
    conclusion,
    conclusionEvent: conclusion && impactMap ? <RootCauseEvent impactMap={impactMap} /> : undefined,
    reasoning:
      investigation && hypotheses.length > 0 ? (
        <HypothesisTreeCard
          input={{
            id: investigation.id,
            title: getInvestigationDisplayTitle(investigation),
            subjects,
            hypotheses,
            conclusion,
            proposals: investigation.proposals,
            isRunning: investigation.in_progress,
          }}
        />
      ) : undefined,
  };
};

/**
 * What the customers felt: one sentence, then the events that show it (with their charts), the
 * latest of each story. No entity lists: the events say what each thing was hurt by.
 */
const CustomerImpact: React.FC<{
  summary?: string;
  impactMap?: InvestigationImpactMapResponse;
}> = ({ summary, impactMap }) => {
  const links = useEventLinks();
  const events = useMemo(() => pickImpactEvents(impactMap?.events ?? []), [impactMap?.events]);
  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="investigationCustomerImpact">
      {summary?.trim() && <EventMarkdown text={summary} />}
      {impactMap &&
        events.map((event, index) => (
          <EventCard
            key={event.id}
            // Only the first is unfolded; the rest are one line each until opened.
            defaultOpen={index === 0}
            event={event}
            impactMap={impactMap}
            onOpen={() => links?.openEvent(event.id)}
            onOpenEntity={(entityId) => links?.openEntity(entityId)}
          />
        ))}
    </EuiFlexGroup>
  );
};

/** The latest event the investigation recorded as the root cause, as the impact section shows its events. */
const RootCauseEvent: React.FC<{ impactMap: InvestigationImpactMapResponse }> = ({ impactMap }) => {
  const links = useEventLinks();
  const event = useMemo(
    () =>
      impactMap.events
        .filter(({ kind }) => kind === 'root_cause')
        .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0],
    [impactMap.events]
  );
  if (!event) return null;
  return (
    <EventCard
      event={event}
      impactMap={impactMap}
      onOpen={() => links?.openEvent(event.id)}
      onOpenEntity={(entityId) => links?.openEntity(entityId)}
    />
  );
};

const LEARNINGS_TITLE = i18n.translate('xpack.agenticInvestigations.overview.learnings.title', {
  defaultMessage: 'Learnings',
});
const LEARNINGS_BODY = i18n.translate('xpack.agenticInvestigations.overview.learnings.body', {
  defaultMessage: 'This will show what Elastic Nightshift learned during the investigation.',
});

/** A placeholder, collapsed, until the learnings of an investigation are recorded. */
const LearningsSection: React.FC = () => {
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationLearnings' });
  return (
    <EuiAccordion
      id={accordionId}
      buttonContent={
        <EuiTitle size="xs">
          <h3>{LEARNINGS_TITLE}</h3>
        </EuiTitle>
      }
      paddingSize="m"
      data-test-subj="agenticInvestigationsLearningsSection"
    >
      <EuiEmptyPrompt
        data-test-subj="agenticInvestigationsLearningsPlaceholder"
        iconType="sparkles"
        titleSize="xs"
        title={<h4>{LEARNINGS_TITLE}</h4>}
        body={<p>{LEARNINGS_BODY}</p>}
      />
    </EuiAccordion>
  );
};

/**
 * The investigation template's overview tab: the conversation joined with what the query API
 * knows about it (subjects, impact, hypotheses), read again while an agent works on it. When the
 * read fails (for example without the read privilege) the tab still shows the conversation.
 */
export const InvestigationOverview: React.FC<
  OverviewSlotRenderProps & {
    /** Present when a solution registered an entity flyout. Entity-store ids open it. */
    onOpenEntity?: (entity: ImpactEntityTarget) => void;
  }
> = ({
  conversation,
  groupedAttachments,
  proposedActionsContent,
  proposedActionsCount,
}) => {
  const { data } = useInvestigation(conversation.id);
  // The flyout is rendered inside the event links, which offer "View in timeline" from outside it.
  const openTimelineRef = useRef<OpenTimeline>();
  const openTimeline = useCallback(() => openTimelineRef.current?.(), []);
  const investigation = useMemo(() => {
    const fromConversation = conversationToInvestigation(conversation);
    const summary = readMetadataString(data?.metadata.summary);
    return summary ? { ...fromConversation, summary } : fromConversation;
  }, [conversation, data?.metadata.summary]);

  const sections = useMemo(
    () => toOverviewSections(data, readMetadataString(conversation.metadata?.verdict)),
    [data, conversation.metadata?.verdict]
  );

  // The skeleton only stands in for an empty overview. Once there is anything to read, such as
  // when an agent resumes after a proposal is decided, the header's running state is enough.
  const hasFindings =
    Boolean(investigation.summary?.trim()) ||
    Object.values(sections).some(Boolean) ||
    (data?.proposals.length ?? 0) > 0;

  return (
    <EventLinksProvider
      impactMap={data?.impact_map}
      conversationId={conversation.id}
      openTimeline={openTimeline}
    >
      <TimelineFlyoutHost
        conversationId={conversation.id}
        impactMap={data?.impact_map}
        onReady={(open) => {
          openTimelineRef.current = open;
        }}
      >
        <OverviewTab
          investigation={investigation}
          attachments={conversation.attachments}
          groupedAttachments={groupedAttachments}
          proposedActionsContent={proposedActionsContent}
          proposedActionsCount={proposedActionsCount}
          sections={sections}
          showLoadingSection={(data?.in_progress ?? false) && !hasFindings}
        />
        <EuiSpacer size="m" />
        <LearningsSection />
      </TimelineFlyoutHost>
    </EventLinksProvider>
  );
};
