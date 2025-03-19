/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { ProductInterceptPrompter } from './prompter';

describe('ProductInterceptPrompter', () => {
  it('defines a start method', () => {
    const prompter = new ProductInterceptPrompter();
    expect(prompter).toHaveProperty('start', expect.any(Function));
  });

  describe('start behaviour', () => {
    const http = httpServiceMock.createStartContract();
    const userProfile = userProfileServiceMock.createStart();
    const notifications = notificationServiceMock.createStartContract();
    const analytics = analyticsServiceMock.createAnalyticsServiceStart();

    let productInterceptAddSpy: jest.SpyInstance;

    beforeEach(() => {
      jest.useFakeTimers();

      productInterceptAddSpy = jest.spyOn(notifications.intercepts, 'add');
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.clearAllMocks();
    });

    it('does not fetch user profile information if trigger info is not available', async () => {
      const prompter = new ProductInterceptPrompter();

      jest.spyOn(http, 'get').mockResolvedValue({});

      prompter.start({
        http,
        notifications,
        userProfile,
        analytics,
      });

      jest.runAllTimers();

      expect(http.get).toHaveBeenCalled();
      expect(userProfile.getCurrent).not.toHaveBeenCalled();
    });

    it('fetches user profile information if trigger info is available', async () => {
      const prompter = new ProductInterceptPrompter();

      const triggerInfo = { runs: 1, triggerIntervalInMs: 3000 };

      jest.spyOn(http, 'get').mockResolvedValue(triggerInfo);

      prompter.start({
        http,
        notifications,
        userProfile,
        analytics,
      });

      await jest.runOnlyPendingTimersAsync();

      expect(http.get).toHaveBeenCalled();

      await jest.runOnlyPendingTimersAsync();

      expect(userProfile.getCurrent).toHaveBeenCalled();
    });
  });
});
