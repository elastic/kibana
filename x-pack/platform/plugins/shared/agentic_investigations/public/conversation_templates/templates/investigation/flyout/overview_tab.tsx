/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  OverviewTab,
  conversationToInvestigation,
  type OverviewSections,
  type OverviewSlotRenderProps,
} from '@kbn/agentic-investigations-common';
import type { Investigation } from '../../../../../common';
import { HypothesesList } from '../../../../hypotheses/attachments/hypotheses_view';
import { ImpactContent } from '../../../../impact/attachments/impact_view';
import { SubjectList } from '../../../../subjects/attachments/subject_view';
import { useInvestigation } from '../../../../investigations/hooks/use_investigation';

const readMetadataString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

/** Sections for the data an investigation has; missing data leaves its section out. */
export const toOverviewSections = (
  investigation: Investigation | undefined,
  fallbackVerdict: string | undefined
): OverviewSections => {
  const subjects = investigation?.subjects ?? [];
  const impact = investigation?.impact;
  const hasImpact =
    impact !== undefined &&
    (Boolean(impact.summary?.trim()) ||
      impact.evidence !== undefined ||
      impact.entities.length > 0);
  const hypotheses = investigation?.hypotheses?.hypotheses ?? [];

  return {
    subjects: subjects.length > 0 ? <SubjectList subjects={subjects} /> : undefined,
    impact: hasImpact ? (
      <ImpactContent
        summary={impact.summary}
        evidence={impact.evidence}
        entities={impact.entities}
        variant="details"
      />
    ) : undefined,
    conclusion: readMetadataString(investigation?.metadata.verdict) ?? fallbackVerdict,
    trace:
      hypotheses.length > 0 ? (
        <HypothesesList hypotheses={hypotheses} variant="details" />
      ) : undefined,
  };
};

/**
 * The investigation template's overview tab: the conversation joined with what the query API
 * knows about it (subjects, impact, hypotheses), read again while an agent works on it. When the
 * read fails (for example without the read privilege) the tab still shows the conversation.
 */
export const InvestigationOverview: React.FC<OverviewSlotRenderProps> = ({
  conversation,
  groupedAttachments,
  proposedActionsContent,
  proposedActionsCount,
}) => {
  const { data } = useInvestigation(conversation.id);
  const investigation = useMemo(() => {
    const fromConversation = conversationToInvestigation(conversation);
    const summary = readMetadataString(data?.metadata.summary);
    return summary ? { ...fromConversation, summary } : fromConversation;
  }, [conversation, data?.metadata.summary]);

  const sections = useMemo(
    () => toOverviewSections(data, readMetadataString(conversation.metadata?.verdict)),
    [data, conversation.metadata?.verdict]
  );

  return (
    <OverviewTab
      investigation={investigation}
      attachments={conversation.attachments}
      groupedAttachments={groupedAttachments}
      proposedActionsContent={proposedActionsContent}
      proposedActionsCount={proposedActionsCount}
      sections={sections}
    />
  );
};
