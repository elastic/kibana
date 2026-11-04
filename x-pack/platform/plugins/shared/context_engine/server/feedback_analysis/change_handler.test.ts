/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import { createFeedbackAnalysisChangeHandler } from './change_handler';
import type { FeedbackAnalysisScheduleService } from './schedule';

const aiIndex: AiIndexHttpItem = {
  id: 'support',
  managed: false,
  memory_enabled: true,
  dest: { type: 'index', value: 'ai-index-support' },
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-11-01T00:00:00.000Z',
  date_modified: '2026-11-01T00:00:00.000Z',
};

describe('createFeedbackAnalysisChangeHandler', () => {
  const request = httpServerMock.createKibanaRequest();
  const scheduleService: jest.Mocked<FeedbackAnalysisScheduleService> = {
    reconcile: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const handler = createFeedbackAnalysisChangeHandler(() => scheduleService);
  const event = { aiIndexId: 'support', spaceId: 'marketing', request, changed: new Set([]) };

  beforeEach(() => jest.clearAllMocks());

  it('runs whenever a save writes feedback_analysis, even unchanged', () => {
    expect(handler.fields).toEqual(['feedback_analysis']);
    expect(handler.when).toBe('saved');
  });

  it('reconciles the saved configuration as the caller', async () => {
    const feedbackAnalysis = { enabled: true, schedule: { interval: '24h' } };

    await handler.onChange({
      ...event,
      current: { ...aiIndex, feedback_analysis: feedbackAnalysis },
    });

    expect(scheduleService.reconcile).toHaveBeenCalledWith({
      aiIndexId: 'support',
      spaceId: 'marketing',
      feedbackAnalysis,
      request,
    });
  });

  it('reconciles without a configuration when the AI index has none', async () => {
    await handler.onChange({ ...event, current: aiIndex });

    expect(scheduleService.reconcile).toHaveBeenCalledWith({
      aiIndexId: 'support',
      spaceId: 'marketing',
      request,
    });
  });

  it('removes the schedule when the AI index is deleted', async () => {
    await handler.onChange({ ...event, previous: aiIndex });

    expect(scheduleService.remove).toHaveBeenCalledWith({
      aiIndexId: 'support',
      spaceId: 'marketing',
    });
    expect(scheduleService.reconcile).not.toHaveBeenCalled();
  });
});
