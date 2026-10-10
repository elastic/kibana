/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { buildAiInsightsChatPrompt, openAiInsightsInChat } from './open_ai_insights_in_chat';

describe('openAiInsightsInChat', () => {
  const insight = {
    status: 'yellow' as const,
    summary: 'Latency is elevated.',
    attention_points: ['p95 above baseline'],
    suggested_actions: ['Filter to checkout'],
  };

  it('builds a prompt that includes the panel insight context', () => {
    const prompt = buildAiInsightsChatPrompt(insight);
    expect(prompt).toContain('Assessment: A few things to watch');
    expect(prompt).toContain('Latency is elevated.');
    expect(prompt).toContain('p95 above baseline');
    expect(prompt).toContain('Filter to checkout');
  });

  it('opens chat with dashboard attachment and panel context', () => {
    const openChat = jest.fn();
    const draftAttachmentId = {
      current: 'draft-1',
      next: jest.fn(),
    };

    openAiInsightsInChat({
      openChat,
      draftAttachmentId,
      parentApi: {
        children$: new BehaviorSubject({}),
        savedObjectId$: new BehaviorSubject('dash-1'),
        getSerializedState: () => ({
          attributes: {
            title: 'Ops',
            panels: [
              {
                id: 'chart',
                type: LENS_EMBEDDABLE_TYPE,
                config: {},
                grid: { x: 0, y: 0, w: 12, h: 12 },
              },
            ],
          },
        }),
      },
      insight,
    });

    expect(openChat).toHaveBeenCalledWith({
      newConversation: true,
      initialMessage: expect.stringContaining('Latency is elevated.'),
      autoSendInitialMessage: false,
      sessionTag: 'dashboard',
      attachments: [
        expect.objectContaining({
          id: 'draft-1',
          origin: 'dash-1',
          type: DASHBOARD_ATTACHMENT_TYPE,
        }),
      ],
    });
  });
});
