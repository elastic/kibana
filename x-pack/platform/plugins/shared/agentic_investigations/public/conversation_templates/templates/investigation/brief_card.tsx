/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { ConversationTemplateBriefCardRenderProps } from '@kbn/agent-builder-browser';
import type { ConversationWithoutRoundsWithPermissions } from '@kbn/agent-builder-common';
import {
  INVESTIGATION_SEVERITIES,
  isInvestigationTitlePending,
  type InvestigationSeverity,
  type InvestigationSummary,
} from '../../../../common';
import { retryOnTransientError } from '../../../retry_on_transient_error';
import { IN_PROGRESS_REFETCH_INTERVAL_MS } from '../../../investigations/hooks/use_investigation';
import type { InvestigationCardsLoader } from '../../../investigations/investigation_cards_loader';
import { investigationQueryKeys } from '../../../investigations/query_keys';
import { InvestigationCard } from './card';

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const isSeverity = (value: unknown): value is InvestigationSeverity =>
  INVESTIGATION_SEVERITIES.some((severity) => severity === value);

/** What the card can show before (or without) the list read: the conversation's own fields. */
export const conversationToInvestigationSummary = (
  conversation: ConversationWithoutRoundsWithPermissions
): InvestigationSummary => {
  const metadata = conversation.metadata ?? {};
  return {
    id: conversation.id,
    title: conversation.title,
    title_pending: isInvestigationTitlePending(conversation.title),
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    agent_id: conversation.agent_id,
    metadata: {
      status: metadata.status === 'closed' ? 'closed' : 'open',
      ...(isSeverity(metadata.severity) && { severity: metadata.severity }),
      ...(readString(metadata.summary) && { summary: readString(metadata.summary) }),
      ...(readString(metadata.verdict) && { verdict: readString(metadata.verdict) }),
    },
    in_progress: false,
    subjects: [],
  };
};

export interface InvestigationBriefCardProps extends ConversationTemplateBriefCardRenderProps {
  loader: InvestigationCardsLoader;
}

/**
 * The `investigation` template's brief card. Shows the conversation right away and fills in the
 * subjects, impact, running state, and pending proposals from one batched list read.
 */
export const InvestigationBriefCard: React.FC<InvestigationBriefCardProps> = ({
  conversation,
  loader,
}) => {
  const { data } = useQuery({
    queryKey: investigationQueryKeys.card(conversation.id),
    queryFn: () => loader.load(conversation.id),
    refetchInterval: (investigation: InvestigationSummary | undefined) =>
      investigation?.in_progress ? IN_PROGRESS_REFETCH_INTERVAL_MS : false,
    retry: retryOnTransientError,
  });
  const investigation = useMemo(
    () => data ?? conversationToInvestigationSummary(conversation),
    [data, conversation]
  );
  return <InvestigationCard investigation={investigation} />;
};
