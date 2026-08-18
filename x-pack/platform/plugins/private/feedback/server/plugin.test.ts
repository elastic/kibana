/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Context } from '@kbn/cordis';
import FeedbackPlugin from './plugin';
import { feedbackSubmittedEventType } from './src';
import { registerSendFeedbackRoute } from './routes';

jest.mock('./routes', () => ({
  registerSendFeedbackRoute: jest.fn(),
}));

const registerSendFeedbackRouteMock = registerSendFeedbackRoute as jest.MockedFunction<
  typeof registerSendFeedbackRoute
>;

describe('FeedbackPlugin', () => {
  let ctx: Context;
  let mockAnalytics: jest.Mocked<{ registerEventType: jest.Mock }>;
  let mockHttp: jest.Mocked<{ createRouter: jest.Mock }>;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = new Context();
    mockAnalytics = { registerEventType: jest.fn() };
    mockHttp = { createRouter: jest.fn().mockReturnValue({}) };
    ctx.provide('core.analytics', mockAnalytics);
    ctx.provide('core.http', mockHttp);
  });

  it('should register the feedback submitted event type', async () => {
    await ctx.plugin(FeedbackPlugin);

    expect(mockAnalytics.registerEventType).toHaveBeenCalledTimes(1);
    expect(mockAnalytics.registerEventType).toHaveBeenCalledWith(feedbackSubmittedEventType);
  });

  it('should create a router and register the send feedback route', async () => {
    await ctx.plugin(FeedbackPlugin);

    expect(mockHttp.createRouter).toHaveBeenCalledTimes(1);
    expect(registerSendFeedbackRouteMock).toHaveBeenCalledTimes(1);
    expect(registerSendFeedbackRouteMock).toHaveBeenCalledWith(
      expect.any(Object),
      mockAnalytics
    );
  });
});
