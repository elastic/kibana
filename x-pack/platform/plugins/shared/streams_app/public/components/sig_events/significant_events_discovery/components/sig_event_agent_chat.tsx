/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { i18n } from '@kbn/i18n';
import type { Insight } from '@kbn/streams-schema';
import { useKibana } from '../../../../hooks/use_kibana';
import { impactLabels } from './insights/insight_constants';

const SIGEVENTS_AGENT_SESSION_TAG = 'streams-significant-events';

export const formatInsightChatMessage = (insight: Insight): string => {
  const evidenceLines = insight.evidence.map(
    (ev) => `- ${ev.query_title} (${ev.event_count} events) on stream \`${ev.stream_name}\``
  );
  const recommendationLines = insight.recommendations.map((rec) => `- ${rec}`);

  const sections = [
    i18n.translate('xpack.streams.sigEventAgentChat.insightPromptIntro', {
      defaultMessage:
        'Help me investigate this significant event from Streams Significant Events discovery.',
    }),
    '',
    `## ${insight.title}`,
    '',
    i18n.translate('xpack.streams.sigEventAgentChat.insightSeverityLabel', {
      defaultMessage: '**Severity:** {severity}',
      values: { severity: impactLabels[insight.impact] },
    }),
    '',
    insight.description,
  ];

  if (evidenceLines.length > 0) {
    sections.push(
      '',
      i18n.translate('xpack.streams.sigEventAgentChat.insightEvidenceHeading', {
        defaultMessage: '**Evidence:**',
      }),
      ...evidenceLines
    );
  }

  if (recommendationLines.length > 0) {
    sections.push(
      '',
      i18n.translate('xpack.streams.sigEventAgentChat.insightRecommendationsHeading', {
        defaultMessage: '**Recommendations:**',
      }),
      ...recommendationLines
    );
  }

  return sections.join('\n');
};

export const formatEntityDetailChatMessage = ({
  title,
  entityId,
  details,
}: {
  title: string;
  entityId: string;
  details: Array<{ title: string; description: React.ReactNode }>;
}): string => {
  const detailLines = details
    .map((item) => {
      const description =
        typeof item.description === 'string' ? item.description : String(item.description ?? '');
      return `**${item.title}:** ${description}`;
    })
    .filter((line) => line.trim().length > 0);

  return [
    i18n.translate('xpack.streams.sigEventAgentChat.entityPromptIntro', {
      defaultMessage: 'Help me investigate this item from Streams Significant Events discovery.',
    }),
    '',
    `## ${title}`,
    '',
    i18n.translate('xpack.streams.sigEventAgentChat.entityIdLabel', {
      defaultMessage: '**ID:** {entityId}',
      values: { entityId },
    }),
    '',
    ...detailLines,
  ].join('\n');
};

export const useOpenSigEventAgentChat = () => {
  const {
    dependencies: {
      start: { agentBuilder },
    },
  } = useKibana();

  return useCallback(
    (initialMessage: string) => {
      agentBuilder?.openChat({
        newConversation: true,
        sessionTag: SIGEVENTS_AGENT_SESSION_TAG,
        initialMessage,
        autoSendInitialMessage: true,
      });
    },
    [agentBuilder]
  );
};

export const DiscussWithAgentButton = ({
  initialMessage,
  dataTestSubj = 'significantEventsDiscussWithAgentButton',
}: {
  initialMessage: string;
  dataTestSubj?: string;
}) => {
  const {
    dependencies: {
      start: { agentBuilder },
    },
  } = useKibana();
  const openChat = useOpenSigEventAgentChat();

  if (!agentBuilder) {
    return null;
  }

  return (
    <AiButton
      iconType="sparkles"
      onClick={() => openChat(initialMessage)}
      data-test-subj={dataTestSubj}
    >
      {i18n.translate('xpack.streams.sigEventAgentChat.discussButtonLabel', {
        defaultMessage: 'Discuss with Agent',
      })}
    </AiButton>
  );
};
