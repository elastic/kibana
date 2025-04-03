/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as Rx from 'rxjs';
import type { UserProfileData } from '@kbn/core-user-profile-common';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { InterceptPrompter } from './prompter';
import { TRIGGER_INFO_API_ROUTE } from '../../common/constants';

describe('ProductInterceptPrompter', () => {
  it('defines a setup method', () => {
    const prompter = new InterceptPrompter();
    expect(prompter).toHaveProperty('setup', expect.any(Function));
  });

  it('defines a start method', () => {
    const prompter = new InterceptPrompter();
    expect(prompter).toHaveProperty('start', expect.any(Function));
  });

  describe('start behaviour', () => {
    const http = httpServiceMock.createStartContract();
    const userProfile = userProfileServiceMock.createStart();
    const notifications = notificationServiceMock.createStartContract();
    const analytics = analyticsServiceMock.createAnalyticsServiceStart();

    let enabled$: Rx.BehaviorSubject<boolean>;
    let userProfile$: Rx.BehaviorSubject<UserProfileData | null>;

    let productInterceptAddSpy: jest.SpyInstance;
    let getUserProfileEnabled$Spy: jest.SpyInstance;
    let getUserProfile$Spy: jest.SpyInstance;

    beforeAll(() => {
      productInterceptAddSpy = jest.spyOn(notifications.intercepts, 'add');
      getUserProfileEnabled$Spy = jest.spyOn(userProfile, 'getEnabled$');
      getUserProfile$Spy = jest.spyOn(userProfile, 'getUserProfile$');
    });

    beforeEach(() => {
      jest.useFakeTimers();

      // create user profile observables with default values
      enabled$ = new Rx.BehaviorSubject<boolean>(false);
      userProfile$ = new Rx.BehaviorSubject<UserProfileData | null>(null);

      getUserProfileEnabled$Spy.mockImplementation(() => enabled$.asObservable());
      getUserProfile$Spy.mockImplementation(() => userProfile$.asObservable());
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.clearAllMocks();
    });

    it('makes a request to the trigger info api endpoint', async () => {
      const prompter = new InterceptPrompter();

      jest.spyOn(http, 'get').mockResolvedValue(null);

      prompter.start({
        http,
        notifications,
        analytics,
      });

      jest.runAllTimers();

      expect(http.get).toHaveBeenCalledWith(TRIGGER_INFO_API_ROUTE);

      prompter.stop();
    });

    it('does not add an intercept if the user profile is not enabled', async () => {
      const prompter = new InterceptPrompter();

      const triggerInfo = {
        registeredAt: new Date(
          '26 March 2025 19:08 GMT+0100 (Central European Standard Time)'
        ).toISOString(),
        triggerIntervalInMs: 30000,
      };

      jest.spyOn(http, 'get').mockResolvedValue(triggerInfo);

      const triggerRuns = 30;
      const timeInMsTillNextRun = triggerInfo.triggerIntervalInMs / 3;

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

      prompter.start({
        http,
        notifications,
        analytics,
      });

      await jest.runOnlyPendingTimersAsync();

      expect(http.get).toHaveBeenCalled();

      jest.advanceTimersByTime(timeInMsTillNextRun);

      expect(productInterceptAddSpy).not.toHaveBeenCalled();

      prompter.stop();
    });

    it('adds an intercept if the user profile is enabled, and the user has not already encountered the next scheduled run', async () => {
      const prompter = new InterceptPrompter();

      const triggerInfo = {
        registeredAt: new Date(
          '26 March 2025 19:08 GMT+0100 (Central European Standard Time)'
        ).toISOString(),
        triggerIntervalInMs: 30000,
      };

      const triggerRuns = 30;
      const timeInMsTillNextRun = triggerInfo.triggerIntervalInMs / 3;

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

      // return the configured trigger info
      jest.spyOn(http, 'get').mockResolvedValue(triggerInfo);

      enabled$.next(true);
      userProfile$.next({
        userSettings: {
          lastInteractedInterceptId: triggerRuns - 1,
        },
      });

      prompter.start({
        http,
        notifications,
        analytics,
      });

      await jest.runOnlyPendingTimersAsync();

      expect(http.get).toHaveBeenCalled();

      jest.advanceTimersByTime(timeInMsTillNextRun);

      expect(productInterceptAddSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'kibana_product_intercept',
        })
      );

      prompter.stop();
    });

    it('does not add an intercept if the user profile is enabled, and the user has already encountered the currently scheduled run', async () => {
      const prompter = new InterceptPrompter();

      const triggerInfo = {
        registeredAt: new Date(
          '26 March 2025 19:08 GMT+0100 (Central European Standard Time)'
        ).toISOString(),
        triggerIntervalInMs: 30000,
      };

      const triggerRuns = 30;
      const timeInMsTillNextRun = triggerInfo.triggerIntervalInMs / 3;

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

      // return the configured trigger info
      jest.spyOn(http, 'get').mockResolvedValue(triggerInfo);

      enabled$.next(true);
      userProfile$.next({
        userSettings: {
          lastInteractedInterceptId: triggerRuns,
        },
      });

      prompter.start({
        http,
        notifications,
        analytics,
      });

      await jest.runOnlyPendingTimersAsync();

      expect(http.get).toHaveBeenCalled();

      jest.advanceTimersByTime(timeInMsTillNextRun);

      expect(productInterceptAddSpy).not.toHaveBeenCalled();

      prompter.stop();
    });

    it('queue another intercept automatically after the configured trigger interval when the time for displaying the intercept for the initial run has elapsed', async () => {
      const prompter = new InterceptPrompter();

      const triggerInfo = {
        registeredAt: new Date(
          '26 March 2025 19:08 GMT+0100 (Central European Standard Time)'
        ).toISOString(),
        triggerIntervalInMs: 30000,
      };

      const triggerRuns = 30;
      const timeInMsTillNextRun = triggerInfo.triggerIntervalInMs / 3;

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

      // return the configured trigger info
      jest.spyOn(http, 'get').mockResolvedValue(triggerInfo);

      enabled$.next(true);
      userProfile$.next({
        userSettings: {
          lastInteractedInterceptId: triggerRuns - 1,
        },
      });

      prompter.start({
        http,
        notifications,
        analytics,
      });

      await jest.runOnlyPendingTimersAsync();

      expect(http.get).toHaveBeenCalled();

      jest.advanceTimersByTime(timeInMsTillNextRun);

      expect(productInterceptAddSpy).toHaveBeenCalled();

      jest.advanceTimersByTime(triggerInfo.triggerIntervalInMs);

      expect(productInterceptAddSpy).toHaveBeenCalledTimes(2);

      prompter.stop();
    });
  });
});
