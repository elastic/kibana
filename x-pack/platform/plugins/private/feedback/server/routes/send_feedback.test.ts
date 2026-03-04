/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerSendFeedbackRoute } from './send_feedback';
import { httpServerMock, analyticsServiceMock, coreMock } from '@kbn/core/server/mocks';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { FEEDBACK_SUBMITTED_EVENT_TYPE } from '../src';

const mockAnalytics = analyticsServiceMock.createAnalyticsServiceSetup();
const router = mockRouter.create();

const mockUser = {
  uid: 'test-user-id',
  enabled: true,
  user: {
    username: 'test_user',
    email: 'test@elastic.co',
    roles: ['superuser'],
    realm_name: 'native',
  },
  labels: {},
  data: {},
};

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
    coreContext.userProfile.getCurrent.mockResolvedValue(mockUser);

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
    coreContext.userProfile.getCurrent.mockResolvedValue(mockUser);

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
