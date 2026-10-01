/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActor, fromPromise, waitFor } from 'xstate';
import type { LogCategory } from '../../types';
import { categorizeLogsService } from './categorize_logs_service';
import type { LogCategorizationParams } from './types';

// Matches the real actor input signature in categorize_documents.ts
type CategorizeDocumentsInput = LogCategorizationParams & {
  samplingProbability: number;
  ignoredCategoryTerms: string[];
  minDocsPerCategory: number;
};

const testParameters: LogCategorizationParams = {
  documentFilters: [],
  endTimestamp: '2024-01-02T00:00:00.000Z',
  index: 'logs-test-*',
  messageField: 'message',
  startTimestamp: '2024-01-01T00:00:00.000Z',
  timeField: '@timestamp',
};

const stubCategory: LogCategory = {
  change: { type: 'none' },
  documentCount: 5,
  histogram: [],
  terms: 'error in component',
};

// Creates a promise that can be resolved or rejected externally, to park the
// machine in a chosen loading state before sending events.
const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('categorizeLogsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cancel from loading states', () => {
    it('cancel in countingDocuments → cancelled with no error', async () => {
      const countDeferred = createDeferred<{
        documentCount: number;
        samplingProbability: number;
      }>();

      const actor = createActor(
        categorizeLogsService.provide({
          actors: {
            countDocuments: fromPromise(() => countDeferred.promise),
            categorizeDocuments: fromPromise(async () => ({
              categories: [] as LogCategory[],
              hasReachedLimit: false as boolean,
            })),
          },
        }),
        { input: testParameters }
      );

      actor.start();
      await waitFor(actor, (state) => state.matches('countingDocuments'));

      actor.send({ type: 'cancel' });
      await waitFor(actor, (state) => state.matches('cancelled'));

      const snapshot = actor.getSnapshot();
      expect(snapshot.context.error).toBeUndefined();
      expect(snapshot.context.categories).toEqual([]);
    });

    it('cancel in fetchingSampledCategories → cancelled with no error', async () => {
      const categorizeDeferred = createDeferred<{
        categories: LogCategory[];
        hasReachedLimit: boolean;
      }>();

      const actor = createActor(
        categorizeLogsService.provide({
          actors: {
            countDocuments: fromPromise(async () => ({
              documentCount: 5000,
              samplingProbability: 0.5,
            })),
            categorizeDocuments: fromPromise(() => categorizeDeferred.promise),
          },
        }),
        { input: testParameters }
      );

      actor.start();
      await waitFor(actor, (state) => state.matches('fetchingSampledCategories'));

      actor.send({ type: 'cancel' });
      await waitFor(actor, (state) => state.matches('cancelled'));

      const snapshot = actor.getSnapshot();
      expect(snapshot.context.error).toBeUndefined();
      expect(snapshot.context.categories).toEqual([]);
    });

    it('cancel in fetchingRemainingCategories → cancelled with no error', async () => {
      let resolvePass2!: (v: { categories: LogCategory[]; hasReachedLimit: boolean }) => void;
      let callCount = 0;

      const actor = createActor(
        categorizeLogsService.provide({
          actors: {
            countDocuments: fromPromise(async () => ({
              documentCount: 5000,
              samplingProbability: 0.5,
            })),
            categorizeDocuments: fromPromise(() => {
              callCount++;
              if (callCount === 1) {
                // pass 1 (sampled) resolves immediately with one category
                return Promise.resolve({ categories: [stubCategory], hasReachedLimit: false });
              }
              // pass 2 (remaining) is held open so we can cancel mid-flight
              return new Promise<{ categories: LogCategory[]; hasReachedLimit: boolean }>((res) => {
                resolvePass2 = res;
              });
            }),
          },
        }),
        { input: testParameters }
      );

      actor.start();
      await waitFor(actor, (state) => state.matches('fetchingRemainingCategories'));

      actor.send({ type: 'cancel' });
      await waitFor(actor, (state) => state.matches('cancelled'));

      const snapshot = actor.getSnapshot();
      expect(snapshot.context.error).toBeUndefined();

      resolvePass2({ categories: [] as LogCategory[], hasReachedLimit: false as boolean });
    });
  });

  describe('retry correctness', () => {
    it('retry after cancel resets context and restarts categorization', async () => {
      const countDeferred = createDeferred<{
        documentCount: number;
        samplingProbability: number;
      }>();

      const actor = createActor(
        categorizeLogsService.provide({
          actors: {
            countDocuments: fromPromise(() => countDeferred.promise),
            categorizeDocuments: fromPromise(async () => ({
              categories: [] as LogCategory[],
              hasReachedLimit: false as boolean,
            })),
          },
        }),
        { input: testParameters }
      );

      actor.start();
      await waitFor(actor, (state) => state.matches('countingDocuments'));

      actor.send({ type: 'cancel' });
      await waitFor(actor, (state) => state.matches('cancelled'));

      actor.send({ type: 'retry' });
      await waitFor(actor, (state) => state.matches('countingDocuments'));

      expect(actor.getSnapshot().context.error).toBeUndefined();
      expect(actor.getSnapshot().context.categories).toEqual([]);

      // Resolve to avoid leaking
      countDeferred.resolve({ documentCount: 0, samplingProbability: 1 });
    });

    it('retry after cancel does not reuse previous categories as ignoredCategoryTerms', async () => {
      let callCount = 0;
      let resolvePass2!: (v: { categories: LogCategory[]; hasReachedLimit: boolean }) => void;
      const calls: Array<{ ignoredCategoryTerms: string[] }> = [];

      const actor = createActor(
        categorizeLogsService.provide({
          actors: {
            countDocuments: fromPromise(async () => ({
              documentCount: 5000,
              samplingProbability: 0.5,
            })),
            categorizeDocuments: fromPromise(({ input }) => {
              callCount++;
              calls.push({
                ignoredCategoryTerms: (input as CategorizeDocumentsInput).ignoredCategoryTerms,
              });

              if (callCount === 1) {
                // pass 1 of run 1: resolves with a category
                return Promise.resolve({ categories: [stubCategory], hasReachedLimit: false });
              }
              if (callCount === 2) {
                // pass 2 of run 1: held so we can cancel
                return new Promise<{ categories: LogCategory[]; hasReachedLimit: boolean }>(
                  (res) => {
                    resolvePass2 = res;
                  }
                );
              }
              // passes in the retry run: resolve immediately with fresh data
              return Promise.resolve({
                categories: [] as LogCategory[],
                hasReachedLimit: false as boolean,
              });
            }),
          },
        }),
        { input: testParameters }
      );

      actor.start();
      // Wait until pass 2 of run 1 is executing (categories from pass 1 are in context)
      await waitFor(actor, (state) => state.matches('fetchingRemainingCategories'));

      actor.send({ type: 'cancel' });
      await waitFor(actor, (state) => state.matches('cancelled'));

      expect(actor.getSnapshot().context.error).toBeUndefined();

      actor.send({ type: 'retry' });
      await waitFor(actor, (state) => state.matches('done'));

      expect(actor.getSnapshot().context.categories).toEqual([]);
      expect(calls).toHaveLength(4);
      expect(calls[3].ignoredCategoryTerms).toEqual([]);

      // Prevent leaking
      resolvePass2({ categories: [] as LogCategory[], hasReachedLimit: false as boolean });
    });

    it('double-submit protection: second retry while in countingDocuments is dropped', async () => {
      let countCallCount = 0;
      const countDeferred = createDeferred<{
        documentCount: number;
        samplingProbability: number;
      }>();

      const actor = createActor(
        categorizeLogsService.provide({
          actors: {
            countDocuments: fromPromise(() => {
              countCallCount++;
              return countDeferred.promise;
            }),
            categorizeDocuments: fromPromise(async () => ({
              categories: [] as LogCategory[],
              hasReachedLimit: false as boolean,
            })),
          },
        }),
        { input: testParameters }
      );

      actor.start();
      await waitFor(actor, (state) => state.matches('countingDocuments'));

      // First cancel+retry to get the machine into countingDocuments from cancelled
      actor.send({ type: 'cancel' });
      await waitFor(actor, (state) => state.matches('cancelled'));
      actor.send({ type: 'retry' });
      await waitFor(actor, (state) => state.matches('countingDocuments'));

      const countBeforeDoubleSubmit = countCallCount;

      // Second retry while already in countingDocuments — must be a no-op
      actor.send({ type: 'retry' });

      expect(actor.getSnapshot().matches('countingDocuments')).toBe(true);
      // The invoke must not have been restarted (new actor = new call)
      // Allow a tick for any queued microtasks
      await new Promise((r) => setTimeout(r, 0));
      expect(countCallCount).toBe(countBeforeDoubleSubmit);

      countDeferred.resolve({ documentCount: 0, samplingProbability: 1 });
    });
  });

  describe('happy paths', () => {
    it('hasTooFewDocuments → done directly', async () => {
      const actor = createActor(
        categorizeLogsService.provide({
          actors: {
            countDocuments: fromPromise(async () => ({ documentCount: 0, samplingProbability: 1 })),
            categorizeDocuments: fromPromise(async () => ({
              categories: [] as LogCategory[],
              hasReachedLimit: false as boolean,
            })),
          },
        }),
        { input: testParameters }
      );

      actor.start();
      await waitFor(actor, (state) => state.matches('done'));

      expect(actor.getSnapshot().context.documentCount).toBe(0);
    });

    it('requiresSampling → fetchingSampledCategories first', async () => {
      const actor = createActor(
        categorizeLogsService.provide({
          actors: {
            countDocuments: fromPromise(async () => ({
              documentCount: 5000,
              samplingProbability: 0.5,
            })),
            categorizeDocuments: fromPromise(async () => ({
              categories: [stubCategory] as LogCategory[],
              hasReachedLimit: false as boolean,
            })),
          },
        }),
        { input: testParameters }
      );

      actor.start();
      await waitFor(actor, (state) => state.matches('done'));

      // Both passes ran: categories should include those from both
      expect(actor.getSnapshot().context.categories.length).toBeGreaterThan(0);
    });
  });
});
