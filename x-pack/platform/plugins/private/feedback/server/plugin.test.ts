/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { FeedbackPlugin } from './plugin';
import { feedbackSubmittedEventType } from './src';
import { registerSendFeedbackRoute } from './routes';

jest.mock('./routes', () => ({
  registerSendFeedbackRoute: jest.fn(),
}));

const coreSetup = coreMock.createSetup();
const plugin = new FeedbackPlugin();

const registerSendFeedbackRouteMock = registerSendFeedbackRoute as jest.MockedFunction<
  typeof registerSendFeedbackRoute
>;

describe('FeedbackPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setup', () => {
    it('should register the feedback submitted event type', () => {
      plugin.setup(coreSetup);

      expect(coreSetup.analytics.registerEventType).toHaveBeenCalledTimes(1);
      expect(coreSetup.analytics.registerEventType).toHaveBeenCalledWith(
        feedbackSubmittedEventType
      );
    });

    it('should create a router and register the send feedback route', () => {
      plugin.setup(coreSetup);

      expect(coreSetup.http.createRouter).toHaveBeenCalledTimes(1);
      expect(registerSendFeedbackRouteMock).toHaveBeenCalledTimes(1);
      expect(registerSendFeedbackRouteMock).toHaveBeenCalledWith(
        expect.any(Object),
        coreSetup.analytics
      );
    });
  });
});
