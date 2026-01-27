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
import {
  TRIGGER_INFO_API_ROUTE,
  INTERCEPT_PROMPTER_LOCAL_STORAGE_KEY,
} from '../../common/constants';
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
    const notifications = notificationServiceMock.createStartContract();
    const userAllowsFeedback = notifications.feedback.isEnabled();

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
          userAllowsFeedback,
        })
      ).toEqual({
        registerIntercept: expect.any(Function),
      });
    });

    describe('registerIntercept', () => {
      let registerIntercept: ReturnType<InterceptPrompter['start']>['registerIntercept'];

      const mockQueueInterceptFn = jest.fn();
      const documentHiddenStateSpy = jest.spyOn(document, 'hidden', 'get');

      let localStorageSetItemSpy: jest.SpyInstance;
      let localStorageGetItemSpy: jest.SpyInstance;

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

      beforeEach(() => {
        jest.useFakeTimers();

        localStorageSetItemSpy = jest.spyOn(Object.getPrototypeOf(window.localStorage), 'setItem');

        localStorageGetItemSpy = jest.spyOn(Object.getPrototypeOf(window.localStorage), 'getItem');

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
          userAllowsFeedback,
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

      it('skips intercept registration logic if feedback is disabled', () => {
        const httpPostSpy = jest.spyOn(http, 'post');

        ({ registerIntercept } = prompter.start({
          http,
          rendering,
          analytics,
          targetDomElement: document.createElement('div'),
          userAllowsFeedback: false,
        }));

        const intercept$ = registerIntercept({
          id: intercept.id,
          config: () => Promise.resolve(intercept),
        });

        expect(intercept$).toEqual(Rx.EMPTY);
        expect(httpPostSpy).not.toHaveBeenCalled();
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

        // a record should have been created in localstorage to track the timer start for the intercept for the current user
        expect(localStorageSetItemSpy).toHaveBeenCalledWith(
          INTERCEPT_PROMPTER_LOCAL_STORAGE_KEY,
          expect.stringMatching(new RegExp(`{\"${intercept.id}\":{\"timerStart\":\".*\"}}`))
        );

        // simulate the passage of time beyond the next trigger
        await jest.advanceTimersByTimeAsync(triggerInfo.triggerIntervalInMs);

        // intercept should not be queued because since the triggering only happens on page load and visibility change
        // if the record in localstorage is stale past the trigger interval
        await waitFor(() => {
          expect(mockQueueInterceptFn).not.toHaveBeenCalled();
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

        // store a record in localstorage that's has a value of the current time in our test clock minus the trigger interval
        // signifying that the timer has elapsed beyond the trigger interval
        localStorageGetItemSpy.mockReturnValue(
          JSON.stringify({
            [intercept.id]: {
              timerStart: new Date(jest.now() - triggerInfo.triggerIntervalInMs - 1).toISOString(),
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

        await waitFor(() => {
          expect(mockQueueInterceptFn).toHaveBeenCalled();
        });

        subscription.unsubscribe();
      });

      it('shows the intercept if the user transitions the document from "hidden" state to "visible" state during qualifying time window', async () => {
        const triggerInfo: TriggerInfo = {
          registeredAt: new Date(
            '08 November 2025 15:55:00 GMT+0100 (Central European Standard Time)'
          ).toISOString(),
          triggerIntervalInMs: 1 * 60 * 1000, // 1 minute
          recurrent: true,
        };

        const { runs: triggerRuns, timeTillNextRun } = prompter.calculateTimeTillTrigger(
          triggerInfo.registeredAt,
          triggerInfo.triggerIntervalInMs
        );

        // return the configured trigger info
        jest.spyOn(http, 'post').mockResolvedValue(triggerInfo);
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

        // advance timers to halfway through the time until the next run should happen
        await jest.advanceTimersByTimeAsync(timeTillNextRun / 2);

        expect(http.post).toHaveBeenCalledWith(TRIGGER_INFO_API_ROUTE, {
          body: JSON.stringify({ triggerId: intercept.id }),
        });

        // transition document hidden state to true
        documentHiddenStateSpy.mockReturnValue(true);
        // trigger visibility change event, simulating the page transitioning from being visible to being hidden
        fireEvent(document, createEvent('visibilitychange', document));

        // simulate the passage of time beyond the next trigger
        await jest.advanceTimersByTimeAsync(triggerInfo.triggerIntervalInMs);

        expect(mockQueueInterceptFn).not.toHaveBeenCalled();

        // transition document hidden state to false
        documentHiddenStateSpy.mockReturnValue(false);
        // trigger visibility change event, simulating the page transitioning from being hidden to being visible
        fireEvent(document, createEvent('visibilitychange', document));

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

        // transition document hidden state to true
        documentHiddenStateSpy.mockReturnValue(true);
        // trigger visibility change event, simulating the page transitioning from being visible to being hidden
        fireEvent(document, createEvent('visibilitychange', document));

        // simulate the passage of time beyond the next trigger
        await jest.advanceTimersByTimeAsync(triggerInfo.triggerIntervalInMs);

        expect(mockQueueInterceptFn).not.toHaveBeenCalled();

        // transition document hidden state to false
        documentHiddenStateSpy.mockReturnValue(false);
        // trigger visibility change event, simulating the page transitioning from being hidden to being visible
        fireEvent(document, createEvent('visibilitychange', document));

        // despite transitioning the document to a visible state, with the configured trigger interval elapsed we should not queue the intercept,
        // because the user already encountered it especially that it's a one off
        expect(mockQueueInterceptFn).not.toHaveBeenCalled();

        subscription.unsubscribe();
      });
    });
  });
});
