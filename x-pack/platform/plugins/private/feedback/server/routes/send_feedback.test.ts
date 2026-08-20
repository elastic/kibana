/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { feedbackBodySchema, registerSendFeedbackRoute } from './send_feedback';
import { httpServerMock, analyticsServiceMock, coreMock } from '@kbn/core/server/mocks';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { FEEDBACK_SUBMITTED_EVENT_TYPE } from '../src';

const mockAnalytics = analyticsServiceMock.createAnalyticsServiceSetup();
const router = mockRouter.create();

const mockUserProfileId = 'test-user-id';

describe('registerSendFeedbackRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register POST route with correct path and validation', () => {
    registerSendFeedbackRoute(router, mockAnalytics);

    const [config] = router.post.mock.calls[0];

    expect(config.path).toBe('/internal/feedback/send');
    expect(config.validate).toBeDefined();
    expect(config.options?.access).toBe('internal');
  });

  it('should report analytics event and return success response', async () => {
    registerSendFeedbackRoute(router, mockAnalytics);

    const [, handler] = router.post.mock.calls[0];

    const coreContext = coreMock.createRequestHandlerContext();
    coreContext.userProfile.getCurrentProfileId.mockResolvedValue(mockUserProfileId);

    const mockContext = {
      core: Promise.resolve(coreContext),
    };

    const mockRequest = httpServerMock.createKibanaRequest({
      body: {
        app_id: 'management:aiAssistantManagementSelection',
        user_email: 'user@elastic.co',
        solution: 'oblt',
        csat_score: 5,
        questions: [
          {
            id: 'q1',
            question: 'How was it?',
            answer: 'Great!',
          },
        ],
        allow_email_contact: true,
        url: '/app/management/ai/aiAssistantManagementSelection',
      },
    });

    const mockResponse = httpServerMock.createResponseFactory();

    await handler(mockContext, mockRequest, mockResponse);

    expect(mockAnalytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(FEEDBACK_SUBMITTED_EVENT_TYPE, {
      app_id: 'management:aiAssistantManagementSelection',
      user_email: 'user@elastic.co',
      solution: 'oblt',
      csat_score: 5,
      questions: [
        {
          id: 'q1',
          question: 'How was it?',
          answer: 'Great!',
        },
      ],
      allow_email_contact: true,
      url: '/app/management/ai/aiAssistantManagementSelection',
      user_id: 'test-user-id',
      source: 'kibana',
    });

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: { success: true },
    });
  });

  it('should reject context with too many entries', () => {
    const oversizedContext = Object.fromEntries(
      Array.from({ length: 17 }, (_, i) => [`key${i}`, true])
    );

    expect(() =>
      feedbackBodySchema.validate({
        app_id: 'discover',
        solution: 'classic',
        allow_email_contact: false,
        url: '/app/discover',
        context: oversizedContext,
      })
    ).toThrow(/context cannot have more than 16 entries/);
  });

  it('should accept context within the entry limit', () => {
    expect(
      feedbackBodySchema.validate({
        app_id: 'discover',
        solution: 'classic',
        allow_email_contact: false,
        url: '/app/discover',
        context: { isEsql: true },
      })
    ).toEqual({
      app_id: 'discover',
      solution: 'classic',
      allow_email_contact: false,
      url: '/app/discover',
      context: { isEsql: true },
    });
  });

  it('should include optional context in the analytics event', async () => {
    registerSendFeedbackRoute(router, mockAnalytics);

    const [, handler] = router.post.mock.calls[0];

    const coreContext = coreMock.createRequestHandlerContext();
    coreContext.userProfile.getCurrentProfileId.mockResolvedValue(mockUserProfileId);

    const mockContext = {
      core: Promise.resolve(coreContext),
    };

    const mockRequest = httpServerMock.createKibanaRequest({
      body: {
        app_id: 'discover',
        solution: 'classic',
        allow_email_contact: false,
        url: '/app/discover',
        context: { isEsql: true },
      },
    });

    const mockResponse = httpServerMock.createResponseFactory();

    await handler(mockContext, mockRequest, mockResponse);

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(FEEDBACK_SUBMITTED_EVENT_TYPE, {
      app_id: 'discover',
      solution: 'classic',
      allow_email_contact: false,
      url: '/app/discover',
      context: { isEsql: true },
      user_id: 'test-user-id',
      source: 'kibana',
    });
  });

  it('reports user_id as undefined when no current profile is resolved', async () => {
    registerSendFeedbackRoute(router, mockAnalytics);

    const [, handler] = router.post.mock.calls[0];

    const coreContext = coreMock.createRequestHandlerContext();
    coreContext.userProfile.getCurrentProfileId.mockResolvedValue(null);

    const mockContext = {
      core: Promise.resolve(coreContext),
    };

    const mockRequest = httpServerMock.createKibanaRequest({
      body: {
        app_id: 'enterpriseSearchContent:connectors',
        solution: 'search',
        allow_email_contact: false,
        url: '/app/elasticsearch/content/connectors',
      },
    });

    const mockResponse = httpServerMock.createResponseFactory();

    await handler(mockContext, mockRequest, mockResponse);

    expect(mockAnalytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(FEEDBACK_SUBMITTED_EVENT_TYPE, {
      app_id: 'enterpriseSearchContent:connectors',
      solution: 'search',
      allow_email_contact: false,
      url: '/app/elasticsearch/content/connectors',
      user_id: undefined,
      source: 'kibana',
    });

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: { success: true },
    });
  });

  it('should return error response on analytics error', async () => {
    registerSendFeedbackRoute(router, mockAnalytics);

    const [, handler] = router.post.mock.calls[0];

    const mockError = new Error('Analytics service error');
    mockAnalytics.reportEvent = jest.fn().mockImplementation(() => {
      throw mockError;
    });

    const coreContext = coreMock.createRequestHandlerContext();
    coreContext.userProfile.getCurrentProfileId.mockResolvedValue(mockUserProfileId);

    const mockContext = {
      core: Promise.resolve(coreContext),
    };

    const mockRequest = httpServerMock.createKibanaRequest({
      body: {
        app_id: 'enterpriseSearchContent:connectors',
        solution: 'search',
        allow_email_contact: false,
        url: '/app/elasticsearch/content/connectors',
      },
    });

    const mockResponse = httpServerMock.createResponseFactory();

    await handler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.customError).toHaveBeenCalledWith({
      body: mockError,
      statusCode: 500,
    });
  });
});
