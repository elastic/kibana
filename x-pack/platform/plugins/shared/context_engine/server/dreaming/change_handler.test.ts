/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import { AiIndexChangeNotifier } from '../ai_indices/changes';
import { createDreamingChangeHandler } from './change_handler';
import type { DreamingScheduleService } from './schedule';

const aiIndex: AiIndexHttpItem = {
  id: 'support',
  managed: false,
  dest: { type: 'index', value: 'ai-index-idx-support' },
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-11-01T00:00:00.000Z',
  date_modified: '2026-11-01T00:00:00.000Z',
};

const dreaming = { enabled: true, facts: [{ type: 'preference' }] };

describe('createDreamingChangeHandler', () => {
  const request = httpServerMock.createKibanaRequest();
  const scheduleService: jest.Mocked<DreamingScheduleService> = {
    reconcile: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const notifier = new AiIndexChangeNotifier(loggingSystemMock.createLogger());
  notifier.register(createDreamingChangeHandler(() => scheduleService));
  const change = { aiIndexId: 'support', spaceId: 'default', request };

  beforeEach(() => jest.clearAllMocks());

  it('reconciles the workflow when the dreaming config changes', async () => {
    const current = { ...aiIndex, dreaming };

    await notifier.notify({ ...change, previous: aiIndex, current, saved: ['dreaming'] });

    expect(scheduleService.reconcile).toHaveBeenCalledWith({
      aiIndex: current,
      spaceId: 'default',
      request,
    });
  });

  it('reconciles when the backing store changes, which the workflow reads', async () => {
    const previous = { ...aiIndex, dreaming };

    await notifier.notify({
      ...change,
      previous,
      current: { ...previous, dest: { type: 'index', value: 'ai-index-idx-support-v2' } },
    });

    expect(scheduleService.reconcile).toHaveBeenCalledTimes(1);
  });

  it('reconciles when the dreaming config is saved unchanged, which retries and re-mints the key', async () => {
    const current = { ...aiIndex, dreaming };

    await notifier.notify({ ...change, previous: current, current, saved: ['dreaming'] });

    expect(scheduleService.reconcile).toHaveBeenCalledTimes(1);
  });

  it('leaves the workflow alone when a save writes only other fields', async () => {
    const current = { ...aiIndex, dreaming };

    await notifier.notify({
      ...change,
      previous: current,
      current: { ...current, feedback_analysis: { enabled: true } },
      saved: ['feedback_analysis'],
    });

    expect(scheduleService.reconcile).not.toHaveBeenCalled();
  });

  it('leaves the workflow alone when a save of the whole AI index changes only other fields', async () => {
    const previous = { ...aiIndex, dreaming };

    await notifier.notify({
      ...change,
      previous,
      current: { ...previous, description: 'Support cases' },
    });

    expect(scheduleService.reconcile).not.toHaveBeenCalled();
  });

  it('removes the workflow when the AI index is deleted', async () => {
    await notifier.notify({ ...change, previous: { ...aiIndex, dreaming } });

    expect(scheduleService.remove).toHaveBeenCalledWith({
      aiIndexId: 'support',
      spaceId: 'default',
      request,
    });
  });
});
