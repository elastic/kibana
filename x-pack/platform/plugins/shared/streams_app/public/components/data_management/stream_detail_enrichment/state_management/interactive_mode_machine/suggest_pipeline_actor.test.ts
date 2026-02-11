/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStatus } from '@kbn/streams-schema';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { pollExistingSuggestionLogic } from './suggest_pipeline_actor';

const flushMicrotasks = async () => {
  // Allow any chained promises in the polling loop to settle.
  await Promise.resolve();
  await Promise.resolve();
};

describe('suggest_pipeline_actor polling', () => {
  describe('pollExistingSuggestionLogic', () => {
    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('polls on an interval until task completes', async () => {
      jest.useFakeTimers();

      const controller = new AbortController();
      const fetchMock = jest.fn(async () => {
        const idx = fetchMock.mock.calls.length - 1;
        const responses = [
          { status: TaskStatus.InProgress },
          { status: TaskStatus.InProgress },
          { status: TaskStatus.Completed, pipeline: { steps: [] } },
        ];

        return responses[Math.min(idx, responses.length - 1)];
      });

      const streamsRepositoryClient = {
        fetch: fetchMock,
      } as unknown as StreamsRepositoryClient;

      const promise = pollExistingSuggestionLogic({
        streamName: 'logs-generic-default',
        signal: controller.signal,
        streamsRepositoryClient,
      });

      await flushMicrotasks();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(2000);
      await flushMicrotasks();
      expect(fetchMock).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(2000);
      await flushMicrotasks();

      await expect(promise).resolves.toEqual({ type: 'completed', pipeline: { steps: [] } });
    });

    it('stops polling immediately when aborted and does not leak timers', async () => {
      jest.useFakeTimers();

      const controller = new AbortController();
      const fetchMock = jest.fn(async () => ({ status: TaskStatus.InProgress }));

      const streamsRepositoryClient = {
        fetch: fetchMock,
      } as unknown as StreamsRepositoryClient;

      const promise = pollExistingSuggestionLogic({
        streamName: 'logs-generic-default',
        signal: controller.signal,
        streamsRepositoryClient,
      });

      await flushMicrotasks();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Abort after the first poll has scheduled the next timer.
      controller.abort();
      await expect(promise).resolves.toEqual({ type: 'none' });

      // Even if time advances, no further polling should occur.
      await jest.advanceTimersByTimeAsync(60_000);
      await flushMicrotasks();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});

