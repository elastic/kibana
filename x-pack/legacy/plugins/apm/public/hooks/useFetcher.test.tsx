/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cleanup, renderHook } from 'react-hooks-testing-library';
import { delay } from '../utils/testHelpers';
import { useFetcher } from './useFetcher';

afterEach(cleanup);

// Suppress warnings about "act" until async/await syntax is supported: https://github.com/facebook/react/issues/14769
/* eslint-disable no-console */
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalError;
});

describe('useFetcher', () => {
  describe('when resolving after 500ms', () => {
    let hook: ReturnType<typeof renderHook>;
    beforeEach(() => {
      jest.useFakeTimers();
      async function fn() {
        await delay(500);
        return 'response from hook';
      }
      hook = renderHook(() => useFetcher(() => fn(), []));
    });

    it('should have loading spinner initally', async () => {
      expect(hook.result.current).toEqual({
        data: undefined,
        error: undefined,
        status: 'loading'
      });
    });

    it('should still show loading spinner after 100ms', async () => {
      jest.advanceTimersByTime(100);

      expect(hook.result.current).toEqual({
        data: undefined,
        error: undefined,
        status: 'loading'
      });
    });

    it('should show success after 1 second', async () => {
      jest.advanceTimersByTime(1000);
      await hook.waitForNextUpdate();

      expect(hook.result.current).toEqual({
        data: 'response from hook',
        error: undefined,
        status: 'success'
      });
    });
  });

  describe('when throwing after 500ms', () => {
    let hook: ReturnType<typeof renderHook>;
    beforeEach(() => {
      jest.useFakeTimers();
      async function fn() {
        await delay(500);
        throw new Error('Something went wrong');
      }
      hook = renderHook(() => useFetcher(() => fn(), []));
    });

    it('should have loading spinner initally', async () => {
      expect(hook.result.current).toEqual({
        data: undefined,
        error: undefined,
        status: 'loading'
      });
    });

    it('should still show loading spinner after 100ms', async () => {
      jest.advanceTimersByTime(100);

      expect(hook.result.current).toEqual({
        data: undefined,
        error: undefined,
        status: 'loading'
      });
    });

    it('should show error after 1 second', async () => {
      jest.advanceTimersByTime(1000);
      await hook.waitForNextUpdate();

      expect(hook.result.current).toEqual({
        data: undefined,
        error: expect.any(Error),
        status: 'failure'
      });
    });
  });

  describe('when a hook already has data', () => {
    it('should show "first response" while loading "second response"', async () => {
      jest.useFakeTimers();
      const hook = renderHook(
        ({ callback, args }) => useFetcher(callback, args),
        {
          initialProps: {
            callback: async () => 'first response',
            args: ['a']
          }
        }
      );
      expect(hook.result.current).toEqual({
        data: undefined,
        error: undefined,
        status: 'loading'
      });

      await hook.waitForNextUpdate();

      // assert: first response has loaded and should be rendered
      expect(hook.result.current).toEqual({
        data: 'first response',
        error: undefined,
        status: 'success'
      });

      // act: re-render hook with async callback
      hook.rerender({
        callback: async () => {
          await delay(500);
          return 'second response';
        },
        args: ['b']
      });

      jest.advanceTimersByTime(100);

      // assert: while loading new data the previous data should still be rendered
      expect(hook.result.current).toEqual({
        data: 'first response',
        error: undefined,
        status: 'loading'
      });

      jest.advanceTimersByTime(500);
      await hook.waitForNextUpdate();

      // assert: "second response" has loaded and should be rendered
      expect(hook.result.current).toEqual({
        data: 'second response',
        error: undefined,
        status: 'success'
      });
    });
  });
});
