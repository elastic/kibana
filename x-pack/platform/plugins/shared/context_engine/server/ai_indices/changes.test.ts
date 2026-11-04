/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import type { AiIndexChangeHandler } from './changes';
import { AiIndexChangeNotifier, diffAiIndex } from './changes';

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

const handler = (overrides: Partial<AiIndexChangeHandler> = {}) => ({
  id: 'test',
  onChange: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('diffAiIndex', () => {
  it('lists the top-level fields whose value differs, comparing deeply', () => {
    const changed = diffAiIndex(aiIndex, {
      ...aiIndex,
      description: 'Support cases',
      automations: [{ type: 'workflow', value: 'nightly' }],
      sources: [],
    });

    expect([...changed].sort()).toEqual(['automations', 'description']);
  });

  it('ignores the id and timestamps', () => {
    const changed = diffAiIndex(aiIndex, {
      ...aiIndex,
      id: 'other',
      date_created: '2026-11-02T00:00:00.000Z',
      date_modified: '2026-11-02T00:00:00.000Z',
    });

    expect(changed.size).toBe(0);
  });

  it('treats a field that appears or disappears as changed', () => {
    const withFeedback = {
      ...aiIndex,
      feedback_analysis: { enabled: true },
    };

    expect([...diffAiIndex(aiIndex, withFeedback)]).toEqual(['feedback_analysis']);
    expect([...diffAiIndex(withFeedback, aiIndex)]).toEqual(['feedback_analysis']);
  });

  it('lists every field that holds a value on create and delete', () => {
    const fields = ['managed', 'memory_enabled', 'dest', 'automations', 'sources', 'traces'];

    expect([...diffAiIndex(undefined, aiIndex)].sort()).toEqual([...fields].sort());
    expect([...diffAiIndex(aiIndex, undefined)].sort()).toEqual([...fields].sort());
  });
});

describe('AiIndexChangeNotifier', () => {
  const logger = loggerMock.create();
  const request = httpServerMock.createKibanaRequest();
  const change = { aiIndexId: 'support', spaceId: 'default', request };

  beforeEach(() => jest.clearAllMocks());

  it('passes the AI index before and after, and what changed', async () => {
    const notifier = new AiIndexChangeNotifier(logger);
    const all = handler();
    notifier.register(all);
    const current = { ...aiIndex, description: 'Support cases' };

    await notifier.notify({ ...change, previous: aiIndex, current });

    expect(all.onChange).toHaveBeenCalledWith({
      ...change,
      previous: aiIndex,
      current,
      changed: new Set(['description']),
    });
  });

  it('runs a handler that names fields only when one of them changed', async () => {
    const notifier = new AiIndexChangeNotifier(logger);
    const onDescription = handler({ id: 'description', fields: ['description'] });
    const onSources = handler({ id: 'sources', fields: ['sources'] });
    notifier.register(onDescription);
    notifier.register(onSources);

    await notifier.notify({
      ...change,
      previous: aiIndex,
      current: { ...aiIndex, description: 'Support cases' },
    });

    expect(onDescription.onChange).toHaveBeenCalledTimes(1);
    expect(onSources.onChange).not.toHaveBeenCalled();
  });

  it('runs a handler that names no fields on every save, changed or not', async () => {
    const notifier = new AiIndexChangeNotifier(logger);
    const all = handler();
    notifier.register(all);

    await notifier.notify({ ...change, previous: aiIndex, current: aiIndex });

    expect(all.onChange).toHaveBeenCalledWith(expect.objectContaining({ changed: new Set() }));
  });

  describe("a handler that runs when its fields are 'saved'", () => {
    const onFeedbackSaved = () =>
      handler({ id: 'feedback', fields: ['feedback_analysis'], when: 'saved' });

    it('runs when the save wrote the field with the value it already had', async () => {
      const notifier = new AiIndexChangeNotifier(logger);
      const feedback = onFeedbackSaved();
      notifier.register(feedback);

      await notifier.notify({
        ...change,
        previous: aiIndex,
        current: aiIndex,
        saved: ['feedback_analysis'],
      });

      expect(feedback.onChange).toHaveBeenCalledWith(
        expect.objectContaining({ saved: new Set(['feedback_analysis']), changed: new Set() })
      );
    });

    it('runs when the save wrote the whole AI index', async () => {
      const notifier = new AiIndexChangeNotifier(logger);
      const feedback = onFeedbackSaved();
      notifier.register(feedback);

      await notifier.notify({ ...change, previous: aiIndex, current: aiIndex });

      expect(feedback.onChange).toHaveBeenCalledTimes(1);
    });

    it('does not run when the save wrote other fields only', async () => {
      const notifier = new AiIndexChangeNotifier(logger);
      const feedback = onFeedbackSaved();
      notifier.register(feedback);

      await notifier.notify({
        ...change,
        previous: aiIndex,
        current: { ...aiIndex, description: 'Support cases' },
        saved: ['description'],
      });

      expect(feedback.onChange).not.toHaveBeenCalled();
    });
  });

  it('logs a failing handler and still runs the others', async () => {
    const notifier = new AiIndexChangeNotifier(logger);
    const failing = handler({
      id: 'failing',
      onChange: jest.fn().mockRejectedValue(new Error('workflows unavailable')),
    });
    const healthy = handler({ id: 'healthy' });
    notifier.register(failing);
    notifier.register(healthy);

    await expect(notifier.notify({ ...change, previous: aiIndex })).resolves.toBeUndefined();

    expect(healthy.onChange).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      "Deleted AI index 'support' in space 'default', but 'failing' failed to apply the change: workflows unavailable"
    );
  });

  it('rejects a second handler with the same id', () => {
    const notifier = new AiIndexChangeNotifier(logger);
    notifier.register(handler());

    expect(() => notifier.register(handler())).toThrow(
      "AI index change handler 'test' is already registered"
    );
  });

  it('rejects handlers registered after setup', () => {
    const notifier = new AiIndexChangeNotifier(logger);
    notifier.freeze();

    expect(() => notifier.register(handler())).toThrow(
      'AI index change handlers must be registered during plugin setup'
    );
  });
});
