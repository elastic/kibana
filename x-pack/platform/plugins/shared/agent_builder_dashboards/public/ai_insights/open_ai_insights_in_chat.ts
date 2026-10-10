/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  dashboardStateToAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import { AI_INSIGHTS_STATUS } from '../../common/ai_insights/constants';
import type { AiInsightsResult } from '../../common/ai_insights/types';
import type { IdGenerator } from '../attachment_types';
import { isDashboardLikeParent } from './build_dashboard_context';
import { AI_INSIGHTS_STATUS_HEADLINE } from './status_copy';

export function buildAiInsightsChatPrompt(insight: AiInsightsResult): string {
  const attention =
    insight.attention_points.length > 0
      ? insight.attention_points.map((point) => `- ${point}`).join('\n')
      : '- None';
  const actions =
    insight.suggested_actions.length > 0
      ? insight.suggested_actions.map((action) => `- ${action}`).join('\n')
      : '- None';
  const status = insight.status ?? AI_INSIGHTS_STATUS.yellow;

  return i18n.translate('xpack.agentBuilderDashboards.aiInsights.addToChat.prompt', {
    defaultMessage: `I added this dashboard from an AI Insights panel. Use the panel findings below as starting context.

Assessment: {statusHeadline}
Why: {summary}

Attention points:
{attentionPoints}

Suggested actions:
{suggestedActions}

Help me investigate these findings and decide what to do next.`,
    values: {
      statusHeadline: AI_INSIGHTS_STATUS_HEADLINE[status],
      summary: insight.summary,
      attentionPoints: attention,
      suggestedActions: actions,
    },
  });
}

function buildDashboardAttachment(
  parentApi: unknown,
  draftAttachmentId: IdGenerator
):
  | {
      id: string;
      origin?: string;
      type: typeof DASHBOARD_ATTACHMENT_TYPE;
      data: ReturnType<typeof dashboardStateToAttachmentData>;
    }
  | undefined {
  if (!isDashboardLikeParent(parentApi)) {
    return undefined;
  }

  const attributes = parentApi.getSerializedState().attributes;
  if (!attributes) {
    return undefined;
  }

  const savedObjectId$ = (parentApi as { savedObjectId$?: PublishingSubject<string | undefined> })
    .savedObjectId$;

  try {
    return {
      id: draftAttachmentId.current,
      origin: savedObjectId$?.getValue(),
      type: DASHBOARD_ATTACHMENT_TYPE,
      data: dashboardStateToAttachmentData(attributes as DashboardState),
    };
  } catch {
    return undefined;
  }
}

export function openAiInsightsInChat({
  openChat,
  draftAttachmentId,
  parentApi,
  insight,
}: {
  openChat: AgentBuilderPluginStart['openChat'];
  draftAttachmentId: IdGenerator;
  parentApi: unknown;
  insight: AiInsightsResult;
}): void {
  const attachment = buildDashboardAttachment(parentApi, draftAttachmentId);

  openChat({
    newConversation: true,
    initialMessage: buildAiInsightsChatPrompt(insight),
    autoSendInitialMessage: false,
    sessionTag: 'dashboard',
    ...(attachment ? { attachments: [attachment] } : {}),
  });
}
