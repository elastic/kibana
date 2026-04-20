/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SUGGESTED_ACTIONS_UI_EVENT } from '@kbn/agent-builder-common';
import { suggestFollowUpsTool } from './suggest_follow_ups';

describe('suggestFollowUpsTool', () => {
  const tool = suggestFollowUpsTool();
  const mockSendUiEvent = jest.fn();
  const mockContext = {
    events: { sendUiEvent: mockSendUiEvent, reportProgress: jest.fn() },
  } as any;

  beforeEach(() => {
    mockSendUiEvent.mockClear();
  });

  it('has the correct tool id', () => {
    expect(tool.id).toBe('platform.core.suggest_follow_ups');
  });

  it('emits a UI event with the suggested actions', async () => {
    const actions = [
      { label: 'Save as dashboard', prompt: 'Save this as a new dashboard' },
      { label: 'Show last 7 days', prompt: 'Show last 7 days data' },
    ];

    await tool.handler({ actions }, mockContext);

    expect(mockSendUiEvent).toHaveBeenCalledWith(SUGGESTED_ACTIONS_UI_EVENT, { actions });
  });

  it('returns a result with action count and labels', async () => {
    const actions = [
      { label: 'Action A', prompt: 'Do action A' },
      { label: 'Action B', prompt: 'Do action B', icon: 'dashboardApp' },
    ];

    const result = await tool.handler({ actions }, mockContext);

    expect(result).toEqual({
      results: [
        expect.objectContaining({
          data: {
            suggested_action_count: 2,
            labels: ['Action A', 'Action B'],
          },
        }),
      ],
    });
  });

  describe('url validation', () => {
    it('passes through a valid /app/ URL', async () => {
      const actions = [
        {
          label: 'Open dashboard',
          prompt: 'Open the dashboard',
          url: '/app/dashboards#/view/abc-123',
        },
      ];

      await tool.handler({ actions }, mockContext);

      expect(mockSendUiEvent).toHaveBeenCalledWith(SUGGESTED_ACTIONS_UI_EVENT, {
        actions: [expect.objectContaining({ url: '/app/dashboards#/view/abc-123' })],
      });
    });

    it('strips a URL that does not start with /app/', async () => {
      const actions = [
        {
          label: 'Evil link',
          prompt: 'fallback prompt',
          url: 'https://evil.example.com/steal-cookies',
        },
      ];

      await tool.handler({ actions }, mockContext);

      expect(mockSendUiEvent).toHaveBeenCalledWith(SUGGESTED_ACTIONS_UI_EVENT, {
        actions: [expect.objectContaining({ url: undefined })],
      });
    });

    it('strips a URL with a protocol scheme embedded after /app/', async () => {
      const actions = [
        {
          label: 'Tricky link',
          prompt: 'fallback prompt',
          url: '/app/javascript:alert(1)',
        },
      ];

      await tool.handler({ actions }, mockContext);

      expect(mockSendUiEvent).toHaveBeenCalledWith(SUGGESTED_ACTIONS_UI_EVENT, {
        actions: [expect.objectContaining({ url: undefined })],
      });
    });

    it('passes through a management URL', async () => {
      const actions = [
        {
          label: 'View connector',
          prompt: 'View the connector',
          url: '/app/management/insightsAndAlerting/triggersActionsConnectors/connectors/abc-123',
        },
      ];

      await tool.handler({ actions }, mockContext);

      expect(mockSendUiEvent).toHaveBeenCalledWith(SUGGESTED_ACTIONS_UI_EVENT, {
        actions: [
          expect.objectContaining({
            url: '/app/management/insightsAndAlerting/triggersActionsConnectors/connectors/abc-123',
          }),
        ],
      });
    });

    it('leaves actions without url unchanged', async () => {
      const actions = [{ label: 'No link', prompt: 'Just a prompt' }];

      await tool.handler({ actions }, mockContext);

      expect(mockSendUiEvent).toHaveBeenCalledWith(SUGGESTED_ACTIONS_UI_EVENT, {
        actions: [expect.objectContaining({ url: undefined })],
      });
    });
  });
});
