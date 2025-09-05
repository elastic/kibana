/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as Rx from 'rxjs';
import React from 'react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { renderingServiceMock } from '@kbn/core-rendering-browser-mocks';
import { InterceptDialogService } from './service';
import { InterceptPrompter, Intercept } from './prompter';
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

      beforeEach(() => {
        jest.useFakeTimers();

        interceptDialogServiceStartFnSpy.mockImplementation(() => {
          return {
            add: mockQueueInterceptFn,
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

      describe('within safeTimer Interval bounds', () => {
        const triggerIntervalInMs = 30000; // 30 seconds

        it('adds an intercept if the user has not already encountered the next scheduled run', async () => {
          const triggerInfo: TriggerInfo = {
            registeredAt: new Date(
              '26 March 2025 19:08 GMT+0100 (Central European Standard Time)'
            ).toISOString(),
            triggerIntervalInMs,
            recurrent: true,
          };

          const triggerRuns = 30;
          const timeInMsTillNextRun = triggerInfo.triggerIntervalInMs / 3;

          // return the configured trigger info
          jest.spyOn(http, 'post').mockResolvedValue(triggerInfo);
          jest.spyOn(http, 'get').mockResolvedValue({ lastInteractedInterceptId: triggerRuns });

          // set system time to time in the future, where there would have been 30 runs of the received trigger,
          // with just about 1/3 of the time before the next trigger
          jest.setSystemTime(
            new Date(
              Date.parse(triggerInfo.registeredAt) +
                triggerInfo.triggerIntervalInMs * triggerRuns +
                triggerInfo.triggerIntervalInMs -
                timeInMsTillNextRun
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

          expect(mockQueueInterceptFn).toHaveBeenCalledWith(
            expect.objectContaining({
              id: intercept.id,
              runId: triggerRuns + 1,
            })
          );

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

          const triggerRuns = 30;
          const timeInMsTillNextRun = triggerInfo.triggerIntervalInMs / 3;

          // return the configured trigger info
          jest.spyOn(http, 'post').mockResolvedValue(triggerInfo);
          jest.spyOn(http, 'get').mockResolvedValue({ lastInteractedInterceptId: triggerRuns + 1 });

          // set system time to time in the future, where there would have been 30 runs of the received trigger,
          // with just about 1/3 of the time before the next trigger
          jest.setSystemTime(
            new Date(
              Date.parse(triggerInfo.registeredAt) +
                triggerInfo.triggerIntervalInMs * triggerRuns +
                triggerInfo.triggerIntervalInMs -
                timeInMsTillNextRun
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

          jest.advanceTimersByTime(timeInMsTillNextRun);

          expect(mockQueueInterceptFn).not.toHaveBeenCalled();

          subscription.unsubscribe();
        });

        it('does not add an intercept if the trigger is expected to be shown only once and the user already encountered that single run of the intercept', async () => {
          const triggerInfo = {
            registeredAt: new Date(
              '26 March 2025 19:08 GMT+0100 (Central European Standard Time)'
            ).toISOString(),
            triggerIntervalInMs,
            recurrent: false,
          };

          const triggerRuns = 30;
          const timeInMsTillNextRun = triggerInfo.triggerIntervalInMs / 3;

          // return the configured trigger info
          jest.spyOn(http, 'post').mockResolvedValue(triggerInfo);
          // configure a user that encountered the intercept on the 30th run
          jest.spyOn(http, 'get').mockResolvedValue({ lastInteractedInterceptId: triggerRuns });

          // set system time to time in the future, where there would have been 30 runs of the received trigger,
          // with just about 1/3 of the time before the next trigger
          jest.setSystemTime(
            new Date(
              Date.parse(triggerInfo.registeredAt) +
                triggerInfo.triggerIntervalInMs * triggerRuns +
                triggerInfo.triggerIntervalInMs -
                timeInMsTillNextRun
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

          jest.advanceTimersByTime(timeInMsTillNextRun);

          // we should not queue the intercept,
          // because the user already encountered it especially that it's a one off
          expect(mockQueueInterceptFn).not.toHaveBeenCalled();

          subscription.unsubscribe();
        });

        it('queues another intercept automatically after the configured trigger interval when the time for displaying the intercept for the initial run has elapsed', async () => {
          const triggerInfo = {
            registeredAt: new Date(
              '26 March 2025 19:08 GMT+0100 (Central European Standard Time)'
            ).toISOString(),
            triggerIntervalInMs,
            recurrent: true,
          };

          const triggerRuns = 30;
          const timeInMsTillNextRun = triggerInfo.triggerIntervalInMs / 3;

          // return the configured trigger info
          jest.spyOn(http, 'post').mockResolvedValue(triggerInfo);
          jest.spyOn(http, 'get').mockResolvedValue({ lastInteractedInterceptId: triggerRuns });

          // set system time to time in the future, where there would have been 30 runs of the received trigger,
          // with just about 1/3 of the time before the next trigger
          jest.setSystemTime(
            new Date(
              Date.parse(triggerInfo.registeredAt) +
                triggerInfo.triggerIntervalInMs * triggerRuns +
                triggerInfo.triggerIntervalInMs -
                timeInMsTillNextRun
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

          jest.advanceTimersByTime(timeInMsTillNextRun);

          expect(mockQueueInterceptFn).toHaveBeenCalledWith(
            expect.objectContaining({
              id: _intercept.id,
              runId: triggerRuns + 1,
            })
          );

          expect(subscriptionHandler).toHaveBeenCalledWith(
            expect.objectContaining({
              lastInteractedInterceptId: triggerRuns,
            })
          );

          // advance to next run and wait for all promises to resolve
          await jest.advanceTimersByTimeAsync(triggerInfo.triggerIntervalInMs);

          expect(mockQueueInterceptFn).toHaveBeenLastCalledWith(
            expect.objectContaining({
              id: _intercept.id,
              runId: triggerRuns + 2,
            })
          );

          expect(subscriptionHandler).toHaveBeenCalledWith(
            expect.objectContaining({
              lastInteractedInterceptId: triggerRuns + 1,
            })
          );

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

          const triggerRuns = 30;
          const timeInMsTillNextRun = triggerInfo.triggerIntervalInMs / 3;

          // have call to http handler return predefined values
          jest.spyOn(http, 'post').mockResolvedValue(triggerInfo);
          jest.spyOn(http, 'get').mockResolvedValue({ lastInteractedInterceptId: triggerRuns });

          // set system time to time in the future, where there would have been 30 runs of the received trigger,
          // with just about 1/3 of the time before the next trigger
          jest.setSystemTime(
            new Date(
              Date.parse(triggerInfo.registeredAt) +
                triggerInfo.triggerIntervalInMs * triggerRuns +
                triggerInfo.triggerIntervalInMs -
                timeInMsTillNextRun
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
          await jest.advanceTimersByTimeAsync(timeInMsTillNextRun);

          expect(mockQueueInterceptFn).toHaveBeenCalledWith(
            expect.objectContaining({
              id: intercept.id,
              runId: triggerRuns + 1,
            })
          );

          subscription.unsubscribe();
        });
      });
    });
  });
});
