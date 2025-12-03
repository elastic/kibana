/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as Rx from 'rxjs';
import React from 'react';
import { fireEvent, createEvent, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { renderingServiceMock } from '@kbn/core-rendering-browser-mocks';
import { InterceptDialogService, UserInterceptRunPersistenceService } from './service';
import type { Intercept } from './prompter';
import { InterceptPrompter } from './prompter';
import { TRIGGER_INFO_API_ROUTE } from '../../common/constants';
import type { TriggerInfo } from '../../common/types';

describe('ProductInterceptPrompter', () => {
  it('defines a setup method', () => {
    const prompter = new InterceptPrompter();
    expect(prompter).toHaveProperty('setup', expect.any(Function));
  });

  it('defines a start method', () => {
    const prompter = new InterceptPrompter();
    expect(prompter).toHaveProperty('start', expect.any(Function));
  });

  describe('#start', () => {
    const http = httpServiceMock.createStartContract();
    const rendering = renderingServiceMock.create();
    const analytics = analyticsServiceMock.createAnalyticsServiceStart();

    const interceptDialogServiceStartFnSpy = jest.spyOn(InterceptDialogService.prototype, 'start');
    const userInterceptRunPersistenceServiceStartFnSpy = jest.spyOn(
      UserInterceptRunPersistenceService.prototype,
      'start'
    );

    let prompter: InterceptPrompter;

    beforeAll(() => {
      prompter = new InterceptPrompter();
    });

    beforeEach(() => {
      prompter.setup({
        analytics: analyticsServiceMock.createAnalyticsServiceSetup(),
        notifications: notificationServiceMock.createSetupContract(),
      });
    });

    it('returns an object with a specific shape', () => {
      expect(
        prompter.start({
          http,
          rendering,
          analytics,
          targetDomElement: document.createElement('div'),
        })
      ).toEqual({
        registerIntercept: expect.any(Function),
      });
    });

    describe('registerIntercept', () => {
      let registerIntercept: ReturnType<InterceptPrompter['start']>['registerIntercept'];

      const mockQueueInterceptFn = jest.fn();

      // default return value for the mockGetUserTriggerData$ function is unset,
      // implying user has not interacted with the intercept yet
      const mockGetUserTriggerData$ = jest.fn<
        Rx.Observable<{ lastInteractedInterceptId: number | null }>,
        [triggerId: string]
      >(() => Rx.of({ lastInteractedInterceptId: null }));

      const interceptSteps: Intercept['steps'] = [
        {
          id: 'start' as const,
          title: 'Hello',
          content: () => React.createElement('p', null, 'Couple of questions for you sir'),
        },
        {
          id: 'interest',
          title: 'Are you interested?',
          content: () => React.createElement('p', null, '...'),
        },
        {
          id: 'completion' as const,
          title: 'Goodbye',
          content: () => React.createElement('p', null, 'Goodbye sir'),
        },
      ];

      const intercept: Intercept = {
        id: 'test-intercept',
        steps: interceptSteps,
        onFinish: jest.fn(),
        onDismiss: jest.fn(),
        onProgress: jest.fn(),
      };

      beforeAll(() => {
        // create mock for requestIdleCallback
        // that will be to provided mock overrides
        Object.defineProperty(window, 'requestIdleCallback', {
          value: jest.fn(),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(window, 'cancelIdleCallback', {
          value: jest.fn(),
          writable: true,
          configurable: true,
        });
      });

      beforeEach(() => {
        jest.useFakeTimers({
          // we do not want to fake requestIdleCallback and cancelIdleCallback,
          // it's implementation in jest which is from sinon is wrong see https://github.com/sinonjs/fake-timers/issues/358
          doNotFake: ['requestIdleCallback', 'cancelIdleCallback'],
        });

        // roll our own implementation of requestIdleCallback and cancelIdleCallback for the purpose of this test
        // Using timeout of 1ms to simulate the browser being idle almost immediately, avoiding the need to
        // advance timers by the configured idle callback timeout in every test.
        jest.spyOn(window, 'requestIdleCallback').mockImplementation((callback) => {
          return setTimeout(() => callback({} as IdleDeadline), 1) as unknown as number;
        });

        jest.spyOn(window, 'cancelIdleCallback').mockImplementation((id) => {
          clearTimeout(id);
        });

        interceptDialogServiceStartFnSpy.mockImplementation(() => {
          return {
            add: mockQueueInterceptFn,
          };
        });

        userInterceptRunPersistenceServiceStartFnSpy.mockImplementation(() => {
          return {
            getUserTriggerData$: mockGetUserTriggerData$,
            updateUserTriggerData: jest.fn(),
          };
        });

        ({ registerIntercept } = prompter.start({
          http,
          rendering,
          analytics,
          targetDomElement: document.createElement('div'),
        }));
      });

      afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
      });

      it('invoking the registerIntercept method returns an observable', () => {
        jest.spyOn(http, 'post').mockResolvedValue({
          registeredAt: new Date().toISOString(),
          triggerIntervalInMs: 1000,
        });

        const intercept$ = registerIntercept({
          id: intercept.id,
          config: () => Promise.resolve(intercept),
        });

        expect(intercept$).toBeInstanceOf(Rx.Observable);
      });

      it('subscribing to the returned observable makes a request to the trigger info api endpoint', async () => {
        jest.spyOn(http, 'post').mockResolvedValue({
          registeredAt: new Date().toISOString(),
          triggerIntervalInMs: 1000,
        });

        const intercept$ = registerIntercept({
          id: intercept.id,
          config: () => Promise.resolve(intercept),
        });

        expect(intercept$).toBeInstanceOf(Rx.Observable);

        const subscriptionHandler = jest.fn();

        const subscription = intercept$.subscribe(subscriptionHandler);

        jest.runAllTimers();

        expect(http.post).toHaveBeenCalledWith(TRIGGER_INFO_API_ROUTE, {
          body: JSON.stringify({ triggerId: intercept.id }),
        });

        expect(subscriptionHandler).not.toHaveBeenCalled();
        expect(mockQueueInterceptFn).not.toHaveBeenCalled();

        subscription.unsubscribe();
      });

      it('does not add an intercept if the intercept is not recurrent and the user has already interacted with it', async () => {
        const triggerInfo: TriggerInfo = {
          registeredAt: new Date(
            '26 March 2025 19:08 GMT+0100 (Central European Standard Time)'
          ).toISOString(),
          triggerIntervalInMs: 30000, // 30 seconds
          recurrent: false,
        };

        const { runs: triggerRuns, timeTillNextRun } = prompter.calculateTimeTillTrigger(
          triggerInfo.registeredAt,
          triggerInfo.triggerIntervalInMs
        );

        // return the configured trigger info
        jest.spyOn(http, 'post').mockResolvedValue(triggerInfo);

        // configure a user that encountered the intercept on the 30th run
        mockGetUserTriggerData$.mockReturnValue(Rx.of({ lastInteractedInterceptId: triggerRuns }));

        // set system time to time in the future, with just the exact time before the next trigger
        jest.setSystemTime(
          new Date(
            Date.parse(triggerInfo.registeredAt) +
              triggerInfo.triggerIntervalInMs * triggerRuns +
              triggerInfo.triggerIntervalInMs -
              timeTillNextRun
          )
        );

        const subscriptionHandler = jest.fn();

        const intercept$ = registerIntercept({
          id: intercept.id,
          config: () => Promise.resolve(intercept),
        });

        const subscription = intercept$.subscribe(subscriptionHandler);

        await jest.runOnlyPendingTimersAsync();

        expect(http.post).toHaveBeenCalledWith(TRIGGER_INFO_API_ROUTE, {
          body: JSON.stringify({ triggerId: intercept.id }),
        });

        // simulate the passage of time beyond the next trigger
        await jest.advanceTimersByTimeAsync(triggerInfo.triggerIntervalInMs);

        // we should not queue the intercept,
        // because the user already encountered it especially that it's a one off
        expect(mockQueueInterceptFn).not.toHaveBeenCalled();

        subscription.unsubscribe();
      });

      describe('localstorage storage overrides for intercept timers', () => {
        let localStorageSetItemSpy: jest.SpyInstance;
        let localStorageGetItemSpy: jest.SpyInstance;

        beforeEach(() => {
          localStorageSetItemSpy = jest.spyOn(
            Object.getPrototypeOf(window.localStorage),
            'setItem'
          );

          localStorageGetItemSpy = jest.spyOn(
            Object.getPrototypeOf(window.localStorage),
            'getItem'
          );
        });

        afterEach(() => {
          jest.resetAllMocks();
        });

        it('will create a record in localstorage to track the timer start for the intercept for the current user', async () => {
          const triggerInfo: TriggerInfo = {
            registeredAt: new Date(
              'Fri Nov 28 2025 15:01:07 GMT+0100 (Central European Standard Time)'
            ).toISOString(),
            triggerIntervalInMs: 30000, // 30 seconds
            recurrent: true,
          };

          const { runs: triggerRuns, timeTillNextRun } = prompter.calculateTimeTillTrigger(
            triggerInfo.registeredAt,
            triggerInfo.triggerIntervalInMs
          );

          // return the configured trigger info
          jest.spyOn(http, 'post').mockResolvedValue(triggerInfo);

          // configure a user that encountered the intercept on the 30th run
          mockGetUserTriggerData$.mockReturnValue(
            Rx.of({ lastInteractedInterceptId: triggerRuns })
          );

          // set system time to time in the future, with just the exact time before the next trigger
          jest.setSystemTime(
            new Date(
              Date.parse(triggerInfo.registeredAt) +
                triggerInfo.triggerIntervalInMs * triggerRuns +
                triggerInfo.triggerIntervalInMs -
                timeTillNextRun
            )
          );

          const subscriptionHandler = jest.fn();

          const intercept$ = registerIntercept({
            id: intercept.id,
            config: () => Promise.resolve(intercept),
          });

          const subscription = intercept$.subscribe(subscriptionHandler);

          await jest.runOnlyPendingTimersAsync();

          expect(http.post).toHaveBeenCalledWith(TRIGGER_INFO_API_ROUTE, {
            body: JSON.stringify({ triggerId: intercept.id }),
          });

          // simulate the passage of time so that the timer has kicked off
          await jest.advanceTimersByTimeAsync(timeTillNextRun / 2);

          // a record will be created in localstorage to track the timer start for the intercept for the current user
          expect(localStorageSetItemSpy).toHaveBeenCalledWith(
            InterceptPrompter.CLIENT_STORAGE_KEY,
            expect.stringMatching(new RegExp(`{\"${intercept.id}\":{\"timerStart\":\".*\"}}`))
          );

          // simulate the passage of time beyond the next trigger
          await jest.advanceTimersByTimeAsync(triggerInfo.triggerIntervalInMs);

          await waitFor(() => {
            expect(mockQueueInterceptFn).toHaveBeenCalled();
          });

          subscription.unsubscribe();
        });

        it('will display the intercept if there is a timer record in localstorage with a timestamp that has elapsed beyond the trigger interval', async () => {
          const triggerInfo: TriggerInfo = {
            registeredAt: new Date(
              'Fri Nov 28 2025 15:01:07 GMT+0100 (Central European Standard Time)'
            ).toISOString(),
            triggerIntervalInMs: 30000, // 30 seconds
            recurrent: true,
          };

          const { runs: triggerRuns, timeTillNextRun } = prompter.calculateTimeTillTrigger(
            triggerInfo.registeredAt,
            triggerInfo.triggerIntervalInMs
          );

          // return the configured trigger info
          jest.spyOn(http, 'post').mockResolvedValue(triggerInfo);

          // configure a user that encountered the intercept on the 30th run
          mockGetUserTriggerData$.mockReturnValue(
            Rx.of({ lastInteractedInterceptId: triggerRuns })
          );

          // set system time to time in the future, with just the exact time before the next trigger
          jest.setSystemTime(
            new Date(
              Date.parse(triggerInfo.registeredAt) +
                triggerInfo.triggerIntervalInMs * triggerRuns +
                triggerInfo.triggerIntervalInMs -
                timeTillNextRun
            )
          );

          // store a record in localstorage that's the current time in our test clock minus the trigger interval
          localStorageGetItemSpy.mockReturnValue(
            JSON.stringify({
              [intercept.id]: {
                timerStart: new Date(
                  jest.now() - triggerInfo.triggerIntervalInMs - 1
                ).toISOString(),
              },
            })
          );

          const subscriptionHandler = jest.fn();

          const intercept$ = registerIntercept({
            id: intercept.id,
            config: () => Promise.resolve(intercept),
          });

          const subscription = intercept$.subscribe(subscriptionHandler);

          // only run timers for http request
          await jest.runOnlyPendingTimersAsync();

          expect(http.post).toHaveBeenCalledWith(TRIGGER_INFO_API_ROUTE, {
            body: JSON.stringify({ triggerId: intercept.id }),
          });

          // advance time ever slightly forward so that timer can kick off, but not beyond the next trigger
          // so we can validate that the localstorage record indeed triggered the intercept to be queued
          await jest.advanceTimersByTimeAsync(Math.max(timeTillNextRun / 3));

          await waitFor(() => {
            expect(mockQueueInterceptFn).toHaveBeenCalled();
          });

          // once when the intercept is queued, because we started off with an existing value in localstorage
          expect(localStorageSetItemSpy).toHaveBeenCalledTimes(1);

          // record in localstorage is updated to track the timer start of the intercept for next iteration
          expect(localStorageSetItemSpy).toHaveBeenCalledWith(
            InterceptPrompter.CLIENT_STORAGE_KEY,
            '{}'
          );

          subscription.unsubscribe();
        });
      });

      describe('within safeTimer Interval bounds', () => {
        const triggerIntervalInMs = 30 * 1000; // 30 seconds

        it('adds an intercept if the user has not already encountered the next scheduled run', async () => {
          const triggerInfo: TriggerInfo = {
            registeredAt: new Date(
              '26 March 2025 19:08 GMT+0100 (Central European Standard Time)'
            ).toISOString(),
            triggerIntervalInMs,
            recurrent: true,
          };

          const { runs: triggerRuns, timeTillNextRun } = prompter.calculateTimeTillTrigger(
            triggerInfo.registeredAt,
            triggerInfo.triggerIntervalInMs
          );

          // return the configured trigger info
          jest.spyOn(http, 'post').mockResolvedValue(triggerInfo);
          mockGetUserTriggerData$.mockReturnValue(
            Rx.of({ lastInteractedInterceptId: triggerRuns })
          );

          // set system time to time in the future, with just the exact time before the next trigger
          jest.setSystemTime(
            new Date(
              Date.parse(triggerInfo.registeredAt) +
                triggerInfo.triggerIntervalInMs * triggerRuns +
                triggerInfo.triggerIntervalInMs -
                timeTillNextRun
            )
          );

          const subscriptionHandler = jest.fn();

          const intercept$ = registerIntercept({
            id: intercept.id,
            config: () => Promise.resolve(intercept),
          });

          const subscription = intercept$.subscribe(subscriptionHandler);

          await jest.runOnlyPendingTimersAsync();

          expect(http.post).toHaveBeenCalledWith(TRIGGER_INFO_API_ROUTE, {
            body: JSON.stringify({ triggerId: intercept.id }),
          });

          // simulate the passage of time beyond the next trigger
          await jest.advanceTimersByTimeAsync(triggerInfo.triggerIntervalInMs);

          await waitFor(() => {
            expect(mockQueueInterceptFn).toHaveBeenCalledWith(
              expect.objectContaining({
                id: intercept.id,
                runId: triggerRuns + 1,
              })
            );
          });

          subscription.unsubscribe();
        });

        it('does not add an intercept if the user has already encountered the currently scheduled run', async () => {
          const triggerInfo: TriggerInfo = {
            registeredAt: new Date(
              '26 March 2025 19:08 GMT+0100 (Central European Standard Time)'
            ).toISOString(),
            triggerIntervalInMs,
            recurrent: true,
          };

          const { runs: triggerRuns, timeTillNextRun } = prompter.calculateTimeTillTrigger(
            triggerInfo.registeredAt,
            triggerInfo.triggerIntervalInMs
          );

          // return the configured trigger info
          jest.spyOn(http, 'post').mockResolvedValue(triggerInfo);

          // simulate a scenario where the user some how already interacted with the intercept for this current run
          mockGetUserTriggerData$.mockReturnValue(
            Rx.of({ lastInteractedInterceptId: triggerRuns + 1 })
          );

          // set system time to time in the future, with just the exact time before the next trigger
          jest.setSystemTime(
            new Date(
              Date.parse(triggerInfo.registeredAt) +
                triggerInfo.triggerIntervalInMs * triggerRuns +
                triggerInfo.triggerIntervalInMs -
                timeTillNextRun
            )
          );

          const subscriptionHandler = jest.fn();

          const intercept$ = registerIntercept({
            id: intercept.id,
            config: () => Promise.resolve(intercept),
          });

          const subscription = intercept$.subscribe(subscriptionHandler);

          await jest.runOnlyPendingTimersAsync();

          expect(http.post).toHaveBeenCalledWith(TRIGGER_INFO_API_ROUTE, {
            body: JSON.stringify({ triggerId: intercept.id }),
          });

          // simulate the passage of time beyond the next trigger
          await jest.advanceTimersByTimeAsync(triggerInfo.triggerIntervalInMs);

          expect(mockQueueInterceptFn).not.toHaveBeenCalled();

          subscription.unsubscribe();
        });

        it('queues another intercept automatically if it is recurring and after the configured trigger interval has elapsed', async () => {
          const triggerInfo = {
            registeredAt: new Date(
              '26 March 2025 19:08 GMT+0100 (Central European Standard Time)'
            ).toISOString(),
            triggerIntervalInMs,
            recurrent: true,
          };

          const { runs: triggerRuns, timeTillNextRun } = prompter.calculateTimeTillTrigger(
            triggerInfo.registeredAt,
            triggerInfo.triggerIntervalInMs
          );

          // return the configured trigger info
          jest.spyOn(http, 'post').mockResolvedValue(triggerInfo);
          mockGetUserTriggerData$.mockReturnValue(
            Rx.of({ lastInteractedInterceptId: triggerRuns })
          );

          // set system time to time in the future, with just the exact time before the next trigger
          jest.setSystemTime(
            new Date(
              Date.parse(triggerInfo.registeredAt) +
                triggerInfo.triggerIntervalInMs * triggerRuns +
                triggerInfo.triggerIntervalInMs -
                timeTillNextRun
            )
          );

          const _intercept = {
            ...intercept,
            id: 'test-repeat-intercept',
          };

          const subscriptionHandler = jest.fn(({ lastInteractedInterceptId }) => {
            // simulate persistence of the user interaction with the intercept
            jest
              .spyOn(http, 'get')
              .mockResolvedValue({ lastInteractedInterceptId: lastInteractedInterceptId + 1 });
          });

          const intercept$ = registerIntercept({
            id: _intercept.id,
            config: () => Promise.resolve(_intercept),
          });

          const subscription = intercept$.subscribe(subscriptionHandler);

          await jest.runOnlyPendingTimersAsync();

          expect(http.post).toHaveBeenCalledWith(TRIGGER_INFO_API_ROUTE, {
            body: JSON.stringify({ triggerId: _intercept.id }),
          });

          // advance time to point in time when next run should happen
          await jest.advanceTimersByTimeAsync(triggerInfo.triggerIntervalInMs);

          await waitFor(() => {
            expect(mockQueueInterceptFn).toHaveBeenCalledWith(
              expect.objectContaining({
                id: _intercept.id,
                runId: triggerRuns + 1,
              })
            );
          });

          // advance to next run and wait for all promises to resolve
          await jest.advanceTimersByTimeAsync(triggerInfo.triggerIntervalInMs * 2);

          await waitFor(() => {
            expect(mockQueueInterceptFn).toHaveBeenLastCalledWith(
              expect.objectContaining({
                id: _intercept.id,
                runId: triggerRuns + 2,
              })
            );
          });

          subscription.unsubscribe();
        });
      });

      describe('outside safeTimer Interval bounds', () => {
        const triggerIntervalInMs = 30 * 24 * 60 * 60 * 1000; // 30 days

        it('handles a trigger interval that exceeds the safe timer bounds gracefully', async () => {
          const triggerInfo: TriggerInfo = {
            registeredAt: new Date(
              '28 May 2025 19:08 GMT+0100 (Central European Standard Time)'
            ).toISOString(),
            triggerIntervalInMs,
            recurrent: true,
          };

          const { runs: triggerRuns, timeTillNextRun } = prompter.calculateTimeTillTrigger(
            triggerInfo.registeredAt,
            triggerInfo.triggerIntervalInMs
          );

          // have call to http handler return predefined values
          jest.spyOn(http, 'post').mockResolvedValue(triggerInfo);

          // return info that corroborates that the user interacted with the last run of the intercept
          mockGetUserTriggerData$.mockReturnValue(
            Rx.of({ lastInteractedInterceptId: triggerRuns })
          );

          // set system time to time in the future, with just the exact time before the next trigger
          jest.setSystemTime(
            new Date(
              Date.parse(triggerInfo.registeredAt) +
                triggerInfo.triggerIntervalInMs * triggerRuns +
                triggerInfo.triggerIntervalInMs -
                timeTillNextRun
            )
          );

          const subscriptionHandler = jest.fn();

          const intercept$ = registerIntercept({
            id: intercept.id,
            config: () => Promise.resolve(intercept),
          });

          const subscription = intercept$.subscribe(subscriptionHandler);

          // cause call to trigger info api route to happen
          await jest.runOnlyPendingTimersAsync();

          expect(http.post).toHaveBeenCalledWith(TRIGGER_INFO_API_ROUTE, {
            body: JSON.stringify({ triggerId: intercept.id }),
          });

          // advance time to point in time when next run should happen
          await jest.advanceTimersByTimeAsync(triggerInfo.triggerIntervalInMs);

          await waitFor(() => {
            expect(mockQueueInterceptFn).toHaveBeenCalledWith(
              expect.objectContaining({
                id: intercept.id,
                runId: triggerRuns + 1,
              })
            );
          });

          subscription.unsubscribe();
        });
      });

      describe('document visibility impact on intercept queueing', () => {
        const triggerIntervalInMs = 10 * 24 * 60 * 60 * 1000; // 10 days

        const documentHiddenStateSpy = jest.spyOn(document, 'hidden', 'get');

        afterEach(() => {
          documentHiddenStateSpy.mockReturnValue(false);
        });

        afterAll(() => {
          documentHiddenStateSpy.mockRestore();
        });

        it('does not queue the intercept even if the time for the next run has elapsed when the document has transitioned to "hidden" state ', async () => {
          const triggerInfo: TriggerInfo = {
            registeredAt: new Date(
              '08 November 2025 15:55:00 GMT+0100 (Central European Standard Time)'
            ).toISOString(),
            triggerIntervalInMs,
            recurrent: true,
          };

          const { runs: triggerRuns, timeTillNextRun } = prompter.calculateTimeTillTrigger(
            triggerInfo.registeredAt,
            triggerInfo.triggerIntervalInMs
          );

          // return the configured trigger info
          jest.spyOn(http, 'post').mockResolvedValue(triggerInfo);

          // return info that corroborates that the user interacted with the last run of the intercept
          mockGetUserTriggerData$.mockReturnValue(
            Rx.of({ lastInteractedInterceptId: triggerRuns })
          );

          // set system time to time in the future, with just the exact time before the next trigger
          jest.setSystemTime(
            new Date(
              Date.parse(triggerInfo.registeredAt) +
                triggerInfo.triggerIntervalInMs * triggerRuns +
                triggerInfo.triggerIntervalInMs -
                timeTillNextRun
            )
          );

          const subscriptionHandler = jest.fn();

          const intercept$ = registerIntercept({
            id: intercept.id,
            config: () => Promise.resolve(intercept),
          });

          const subscription = intercept$.subscribe(subscriptionHandler);

          // advance timers to halfway through the time until the next run should happen
          await jest.advanceTimersByTimeAsync(timeTillNextRun / 2);

          expect(http.post).toHaveBeenCalledWith(TRIGGER_INFO_API_ROUTE, {
            body: JSON.stringify({ triggerId: intercept.id }),
          });

          // set document hidden state to true
          documentHiddenStateSpy.mockReturnValue(true);
          // trigger visibility change event, simulating the page transitioning from being visible to hidden
          fireEvent(document, createEvent('visibilitychange', document));

          // allow entire time for which the intercept ought to have displayed to elapse
          await jest.advanceTimersByTimeAsync(timeTillNextRun / 2);

          expect(mockQueueInterceptFn).not.toHaveBeenCalledWith(
            expect.objectContaining({
              id: intercept.id,
              runId: triggerRuns + 1,
            })
          );

          subscription.unsubscribe();
        });

        it('shows the intercept if the user transitions the document from "hidden" state to "visible" state during qualifying time window', async () => {
          const triggerInfo: TriggerInfo = {
            registeredAt: new Date(
              '08 November 2025 15:55:00 GMT+0100 (Central European Standard Time)'
            ).toISOString(),
            triggerIntervalInMs,
            recurrent: true,
          };

          const { runs: triggerRuns, timeTillNextRun } = prompter.calculateTimeTillTrigger(
            triggerInfo.registeredAt,
            triggerInfo.triggerIntervalInMs
          );

          // return the configured trigger info
          jest.spyOn(http, 'post').mockResolvedValue(triggerInfo);
          mockGetUserTriggerData$.mockReturnValue(
            Rx.of({ lastInteractedInterceptId: triggerRuns })
          );

          // set system time to time in the future, with just the exact time before the next trigger
          jest.setSystemTime(
            new Date(
              Date.parse(triggerInfo.registeredAt) +
                triggerInfo.triggerIntervalInMs * triggerRuns +
                triggerInfo.triggerIntervalInMs -
                timeTillNextRun
            )
          );

          const subscriptionHandler = jest.fn();

          const intercept$ = registerIntercept({
            id: intercept.id,
            config: () => Promise.resolve(intercept),
          });

          const subscription = intercept$.subscribe(subscriptionHandler);

          // advance timers to halfway through the time until the next run should happen
          await jest.advanceTimersByTimeAsync(timeTillNextRun / 2);

          expect(http.post).toHaveBeenCalledWith(TRIGGER_INFO_API_ROUTE, {
            body: JSON.stringify({ triggerId: intercept.id }),
          });

          // set document hidden state to true
          documentHiddenStateSpy.mockReturnValue(true);
          // trigger visibility change event, simulating the page transitioning from being visible to being hidden
          fireEvent(document, createEvent('visibilitychange', document));

          // simulate the passage of time beyond the next trigger
          await jest.advanceTimersByTimeAsync(triggerInfo.triggerIntervalInMs);

          expect(mockQueueInterceptFn).not.toHaveBeenCalled();

          // set document hidden state to false
          documentHiddenStateSpy.mockReturnValue(false);
          // trigger visibility change event, simulating the page transitioning from being hidden to being visible
          fireEvent(document, createEvent('visibilitychange', document));

          // simulate the passage of time beyond the next trigger
          await jest.advanceTimersByTimeAsync(triggerInfo.triggerIntervalInMs);

          await waitFor(() => {
            expect(mockQueueInterceptFn).toHaveBeenCalledWith(
              expect.objectContaining({
                id: intercept.id,
                // the next run id is the current run id plus 2 because the page was hidden for a portion of the time for which the intercept ought to have displayed
                runId: triggerRuns + 2,
              })
            );
          });

          subscription.unsubscribe();
        });
      });
    });
  });
});
