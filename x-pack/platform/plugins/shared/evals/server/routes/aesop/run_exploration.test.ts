/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  httpServerMock,
  loggingSystemMock,
  elasticsearchServiceMock,
} from '@kbn/core/server/mocks';
import { registerRunExplorationRoute } from './run_exploration';
import { discoverIndices } from '../../services/index_discovery';
import { inferAnalystRole, describeRole } from '../../services/analyst_role_inference';
import { calibrateSamplingStrategy } from '../../services/sampling_strategy';
import { WorkflowStateTracker } from '../../lib/aesop/workflows/workflow_state_tracker';
import { PersistentRateLimiter } from '../../lib/aesop/security/persistent_rate_limiter';
import { withAesopSpan } from '../../lib/aesop/monitoring/tracing';

jest.mock('../../services/index_discovery');
jest.mock('../../services/analyst_role_inference');
jest.mock('../../services/sampling_strategy');
jest.mock('../../lib/aesop/workflows/workflow_state_tracker');
jest.mock('../../lib/aesop/security/persistent_rate_limiter');
// The tracing helper wraps `@kbn/tracing-utils`. We don't want to spin up
// a real OTel SDK in unit tests, so we replace it with a pass-through
// implementation that just runs the callback. Span attributes are not
// asserted here; trace coverage is exercised by integration tests.
jest.mock('../../lib/aesop/monitoring/tracing', () => ({
  __esModule: true,
  withAesopSpan: jest.fn(async (_name: string, _opts: unknown, cb: () => unknown) => cb()),
}));

const mockDiscoverIndices = discoverIndices as jest.MockedFunction<typeof discoverIndices>;
const mockInferAnalystRole = inferAnalystRole as jest.MockedFunction<typeof inferAnalystRole>;
const mockDescribeRole = describeRole as jest.MockedFunction<typeof describeRole>;
const mockCalibrateSamplingStrategy = calibrateSamplingStrategy as jest.MockedFunction<
  typeof calibrateSamplingStrategy
>;
const mockWithAesopSpan = withAesopSpan as jest.MockedFunction<typeof withAesopSpan>;

const MockWorkflowStateTracker = WorkflowStateTracker as jest.MockedClass<
  typeof WorkflowStateTracker
>;
const MockPersistentRateLimiter = PersistentRateLimiter as jest.MockedClass<
  typeof PersistentRateLimiter
>;

describe('POST /internal/aesop/exploration/run', () => {
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let routeHandler: Function;
  let mockRouter: any;

  const mockScopedClient = () => ({
    asCurrentUser: mockEsClient,
    asInternalUser: mockEsClient,
  });

  const createMockContext = (
    currentUser: { username: string } | null = { username: 'test-user' }
  ) =>
    ({
      core: Promise.resolve({
        elasticsearch: {
          client: mockScopedClient(),
        },
        security: {
          authc: {
            getCurrentUser: () => currentUser,
          },
        },
      }),
      evals: Promise.resolve({
        getAgentBuilderStart: () => undefined,
        getActionsStart: () => undefined,
        datasetService: undefined,
      }),
    } as any);

  const createMockRequest = (overrides: Record<string, any> = {}) => {
    const request = httpServerMock.createKibanaRequest({
      body: { include_sample_data: true },
      ...overrides,
    });
    // KibanaRequest.auth is not settable via constructor — override directly
    (request as any).auth = { credentials: { username: 'test-user' } };
    return request;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = loggingSystemMock.createLogger();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockResponse = httpServerMock.createResponseFactory();

    mockRouter = {
      versioned: {
        post: jest.fn().mockReturnValue({
          addVersion: jest.fn((_config: any, handler: Function) => {
            routeHandler = handler;
          }),
        }),
      },
    } as any;

    // Default mock implementations for a successful flow
    MockPersistentRateLimiter.prototype.checkRateLimit = jest.fn().mockResolvedValue({
      allowed: true,
      limit: 1,
      remaining: 0,
      resetAt: Date.now() + 3600000,
    });

    mockDiscoverIndices.mockResolvedValue({
      indices: [
        {
          name: '.alerts-security.alerts-default',
          type: 'alerts',
          isDataStream: false,
          docCount: 5000,
          ageRange: { oldest: new Date(), newest: new Date() },
          fields: ['@timestamp', 'event.action'],
          relevanceScore: 95,
        },
        {
          name: 'logs-endpoint.events.process-default',
          type: 'logs',
          isDataStream: true,
          docCount: 100000,
          ageRange: { oldest: new Date(), newest: new Date() },
          fields: ['@timestamp', 'process.name'],
          relevanceScore: 80,
        },
      ],
      totalDocCount: 105000,
      discoveredAt: new Date(),
      securityRelevantCount: 2,
    });

    mockInferAnalystRole.mockResolvedValue({
      role: 'soc_analyst',
      confidence: 0.85,
      scores: {
        soc_analyst: 10,
        threat_hunter: 3,
        security_engineer: 2,
        ops_analyst: 1,
        unknown: 0,
      },
      eventCount: 150,
    });

    mockDescribeRole.mockReturnValue('SOC Analyst (alert triage and response)');

    mockCalibrateSamplingStrategy.mockResolvedValue({
      sampleRate: 0.1,
      strategyName: 'Time-Based Sampling (10%)',
      estimatedDocsSampled: 10500,
      depthLevel: 'standard',
      description: 'Medium dataset',
    });

    MockWorkflowStateTracker.prototype.initializeExecution = jest.fn().mockResolvedValue(undefined);

    registerRunExplorationRoute({ router: mockRouter, logger: mockLogger });
  });

  describe('successful exploration', () => {
    it('should return 200 with execution details on success', async () => {
      const mockContext = createMockContext();
      const mockRequest = createMockRequest();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          success: true,
          execution_id: expect.stringMatching(/^aesop-/),
          workflow_name: 'aesop.self_exploration',
          status: 'running',
          started_at: expect.any(String),
          message: expect.stringContaining('Autonomous exploration started'),
        }),
      });
    });

    it('should pass the scoped client (with asCurrentUser and asInternalUser) to discoverIndices', async () => {
      const scopedClient = mockScopedClient();
      const mockContext = {
        core: Promise.resolve({
          elasticsearch: { client: scopedClient },
          security: { authc: { getCurrentUser: () => ({ username: 'test-user' }) } },
        }),
      } as any;
      const mockRequest = createMockRequest();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockDiscoverIndices).toHaveBeenCalledWith(scopedClient, mockLogger);
      // Verify the client has both properties (IScopedClusterClient)
      const passedClient = mockDiscoverIndices.mock.calls[0][0] as any;
      expect(passedClient.asCurrentUser).toBeDefined();
      expect(passedClient.asInternalUser).toBeDefined();
    });

    it('should pass esClient.asCurrentUser to WorkflowStateTracker', async () => {
      const scopedClient = mockScopedClient();
      const mockContext = {
        core: Promise.resolve({
          elasticsearch: { client: scopedClient },
          security: { authc: { getCurrentUser: () => ({ username: 'test-user' }) } },
        }),
      } as any;
      const mockRequest = createMockRequest();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(MockWorkflowStateTracker).toHaveBeenCalledWith(scopedClient.asCurrentUser, mockLogger);
    });

    it('should emit an OTLP span for the exploration kickoff with the right name and attributes', async () => {
      const mockContext = createMockContext();
      const mockRequest = createMockRequest();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockWithAesopSpan).toHaveBeenCalledWith(
        'aesop.exploration.started',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'aesop.kind': 'workflow_step',
            'aesop.step_name': 'exploration_started',
            'aesop.workflow_name': 'aesop.autonomous_exploration',
            'aesop.execution_id': expect.stringMatching(/^aesop-/),
            'aesop.user_id': 'test-user',
            'aesop.analyst_role': 'soc_analyst',
            'aesop.analyst_role_source': 'inferred',
            'aesop.discovered_indices_count': 2,
            'aesop.sampling_strategy': 'Time-Based Sampling (10%)',
          }),
        }),
        expect.any(Function)
      );
    });

    it('should pass the authenticated username to inferAnalystRole', async () => {
      const mockContext = createMockContext({ username: 'test-user' });
      const mockRequest = createMockRequest();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockInferAnalystRole).toHaveBeenCalledWith(expect.anything(), mockLogger, 'test-user');
    });

    it('should pass discovered indices to calibrateSamplingStrategy', async () => {
      const mockContext = createMockContext();
      const mockRequest = createMockRequest();

      await routeHandler(mockContext, mockRequest, mockResponse);

      const expectedIndices = (await mockDiscoverIndices.mock.results[0].value).indices;
      expect(mockCalibrateSamplingStrategy).toHaveBeenCalledWith(
        expect.anything(),
        mockLogger,
        expectedIndices
      );
    });

    it('should initialize the workflow state tracker with the execution id', async () => {
      const mockContext = createMockContext();
      const mockRequest = createMockRequest();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(MockWorkflowStateTracker.prototype.initializeExecution).toHaveBeenCalledWith(
        expect.stringMatching(/^aesop-/),
        'aesop.self_exploration'
      );
    });
  });

  describe('no indices found', () => {
    it('should continue with empty indices (logs warning but does not return 400)', async () => {
      // Implementation logs when no indices found but proceeds with exploration anyway.
      // This matches the implementation's "exploration will rely on conversation analysis only" behavior.
      mockDiscoverIndices.mockResolvedValue({
        indices: [],
        totalDocCount: 0,
        discoveredAt: new Date(),
        securityRelevantCount: 0,
      });

      const mockContext = createMockContext();
      const mockRequest = createMockRequest();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Should proceed to role inference even with no indices
      expect(mockInferAnalystRole).toHaveBeenCalled();
      // Should return 200 OK
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          success: true,
          status: 'running',
        }),
      });
    });
  });

  describe('rate limiting', () => {
    it('should return 429 when rate limited', async () => {
      MockPersistentRateLimiter.prototype.checkRateLimit = jest.fn().mockResolvedValue({
        allowed: false,
        limit: 1,
        remaining: 0,
        retryAfterSeconds: 3200,
        resetAt: Date.now() + 3200000,
      });

      const mockContext = createMockContext();
      const mockRequest = createMockRequest();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 429,
          body: {
            message: expect.stringContaining('Rate limit exceeded'),
          },
          headers: expect.objectContaining({
            'Retry-After': '3200',
            'X-RateLimit-Limit': '1',
            'X-RateLimit-Remaining': '0',
          }),
        })
      );
      // Should not proceed to discovery
      expect(mockDiscoverIndices).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should return 500 on unexpected errors from discoverIndices', async () => {
      mockDiscoverIndices.mockRejectedValue(new Error('Cluster unavailable'));

      const mockContext = createMockContext();
      const mockRequest = createMockRequest();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: expect.stringContaining('Failed to start exploration'),
        },
      });
      // Implementation logs as a template string, not structured log
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AESOP] Failed to start exploration')
      );
    });

    it('should return 500 on unexpected errors from inferAnalystRole', async () => {
      mockInferAnalystRole.mockRejectedValue(new Error('Event log index missing'));

      const mockContext = createMockContext();
      const mockRequest = createMockRequest();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: expect.stringContaining('Failed to start exploration'),
        },
      });
    });

    it('should return 500 on unexpected errors from workflow state tracker', async () => {
      MockWorkflowStateTracker.prototype.initializeExecution = jest
        .fn()
        .mockRejectedValue(new Error('ES write blocked'));

      const mockContext = createMockContext();
      const mockRequest = createMockRequest();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: expect.stringContaining('Failed to start exploration'),
        },
      });
    });

    it('should handle non-Error thrown values gracefully', async () => {
      mockDiscoverIndices.mockRejectedValue('string error');

      const mockContext = createMockContext();
      const mockRequest = createMockRequest();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: expect.stringContaining('string error'),
        },
      });
    });
  });

  describe('userId handling', () => {
    it('should fall back to "anonymous" when the security service returns no user', async () => {
      // Security disabled / insecure dev mode -> getCurrentUser() returns null.
      const mockContext = createMockContext(null);
      const mockRequest = createMockRequest();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockInferAnalystRole).toHaveBeenCalledWith(expect.anything(), mockLogger, 'anonymous');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('without an authenticated user')
      );
    });
  });

  describe('route registration', () => {
    it('should register POST route for /internal/aesop/exploration/run', () => {
      expect(mockRouter.versioned.post).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/internal/aesop/exploration/run',
          access: 'internal',
          security: {
            authz: {
              requiredPrivileges: ['evals'],
            },
          },
          options: {
            tags: ['access:evals'],
          },
        })
      );
    });
  });
});
