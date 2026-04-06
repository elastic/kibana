/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tests for AESOP Alerting Rules Deployment Route
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { registerDeployAlertingRulesRoute } from './deploy_alerting_rules';
import { ALERTING_RULES } from '../../lib/aesop/monitoring/alerting_rules';

describe('Deploy Alerting Rules Route', () => {
  let mockRouter: any;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockEsClient: any;
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let routeHandler: Function;

  const createMockContext = () =>
    ({
      core: Promise.resolve({
        elasticsearch: {
          client: {
            asCurrentUser: mockEsClient,
          },
        },
      }),
    } as any);

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = loggingSystemMock.createLogger();
    mockResponse = httpServerMock.createResponseFactory();

    mockEsClient = {
      index: jest.fn().mockResolvedValue({ _id: 'test' }),
      exists: jest.fn().mockResolvedValue(false),
      indices: {
        exists: jest.fn().mockResolvedValue(false),
        existsIndexTemplate: jest.fn().mockResolvedValue(false),
        putIndexTemplate: jest.fn().mockResolvedValue({}),
      },
    };

    mockRouter = {
      versioned: {
        post: jest.fn().mockReturnValue({
          addVersion: jest.fn((_config: any, handler: Function) => {
            routeHandler = handler;
          }),
        }),
      },
    } as any;

    registerDeployAlertingRulesRoute({ router: mockRouter, logger: mockLogger });
  });

  describe('POST /internal/aesop/monitoring/alerts/deploy', () => {
    it('should deploy all rules by default', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: {},
      });

      await routeHandler(createMockContext(), request, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            success: true,
            dry_run: false,
            rule_ids: expect.arrayContaining(ALERTING_RULES.map((r) => r.id)),
          }),
        })
      );

      // Should have called index template creation
      expect(mockEsClient.indices.putIndexTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'aesop-alert-rules-template',
          index_patterns: ['.aesop-alert-rules'],
        })
      );

      // Should have indexed each rule
      expect(mockEsClient.index).toHaveBeenCalledTimes(ALERTING_RULES.length);
    });

    it('should deploy only specified rules', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: {
          rule_ids: ['aesop.exploration.failure_rate_high', 'aesop.exploration.duration_excessive'],
        },
      });

      await routeHandler(createMockContext(), request, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            success: true,
            rule_ids: [
              'aesop.exploration.failure_rate_high',
              'aesop.exploration.duration_excessive',
            ],
          }),
        })
      );

      // Should have indexed only 2 rules
      expect(mockEsClient.index).toHaveBeenCalledTimes(2);
    });

    it('should return preview in dry run mode', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: {
          dry_run: true,
        },
      });

      await routeHandler(createMockContext(), request, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            success: true,
            dry_run: true,
            rules_created: 0,
            rules_updated: 0,
            rules_skipped: 0,
            preview: expect.arrayContaining([
              expect.objectContaining({
                id: expect.any(String),
                name: expect.any(String),
                description: expect.any(String),
                rule_type: expect.stringMatching(/esql|threshold|kuery/),
              }),
            ]),
          }),
        })
      );

      // Should not have called index
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('should skip existing rules when overwrite is false', async () => {
      // Mock existing rule
      mockEsClient.exists.mockResolvedValue(true);

      const request = httpServerMock.createKibanaRequest({
        body: {
          overwrite: false,
          rule_ids: ['aesop.exploration.failure_rate_high'],
        },
      });

      await routeHandler(createMockContext(), request, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            success: true,
            rules_created: 0,
            rules_updated: 0,
            rules_skipped: 1,
          }),
        })
      );

      // Should not have indexed (rule was skipped)
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('should update existing rules when overwrite is true', async () => {
      // Mock existing rule
      mockEsClient.exists.mockResolvedValue(true);

      const request = httpServerMock.createKibanaRequest({
        body: {
          overwrite: true,
          rule_ids: ['aesop.exploration.failure_rate_high'],
        },
      });

      await routeHandler(createMockContext(), request, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            success: true,
            rules_created: 0,
            rules_updated: 1,
            rules_skipped: 0,
          }),
        })
      );

      // Should have indexed (updated rule)
      expect(mockEsClient.index).toHaveBeenCalledTimes(1);
    });

    it('should return bad request for invalid rule IDs', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: {
          rule_ids: ['invalid-rule-id'],
        },
      });

      await routeHandler(createMockContext(), request, mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            message: expect.stringContaining('No matching rules found'),
          }),
        })
      );
    });

    it('should handle partial failures gracefully', async () => {
      // First rule succeeds, second fails
      mockEsClient.index
        .mockResolvedValueOnce({ _id: 'success' } as any)
        .mockRejectedValueOnce(new Error('Index failure'));

      const request = httpServerMock.createKibanaRequest({
        body: {
          rule_ids: ['aesop.exploration.failure_rate_high', 'aesop.exploration.duration_excessive'],
        },
      });

      await routeHandler(createMockContext(), request, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            success: false, // Has errors
            rules_created: 1,
            errors: expect.arrayContaining([
              expect.objectContaining({
                rule_id: 'aesop.exploration.duration_excessive',
                error: 'Index failure',
              }),
            ]),
          }),
        })
      );
    });

    it('should create index template if it does not exist', async () => {
      mockEsClient.indices.existsIndexTemplate.mockResolvedValue(false);

      const request = httpServerMock.createKibanaRequest({
        body: {
          rule_ids: ['aesop.exploration.failure_rate_high'],
        },
      });

      await routeHandler(createMockContext(), request, mockResponse);

      expect(mockEsClient.indices.putIndexTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'aesop-alert-rules-template',
          index_patterns: ['.aesop-alert-rules'],
          template: expect.objectContaining({
            settings: expect.objectContaining({
              number_of_shards: 1,
              hidden: true,
            }),
            mappings: expect.objectContaining({
              properties: expect.objectContaining({
                id: { type: 'keyword' },
                name: { type: 'text' },
                rule_type: { type: 'keyword' },
              }),
            }),
          }),
        })
      );
    });

    it('should skip template creation if it already exists', async () => {
      mockEsClient.indices.existsIndexTemplate.mockResolvedValue(true);

      const request = httpServerMock.createKibanaRequest({
        body: {
          rule_ids: ['aesop.exploration.failure_rate_high'],
        },
      });

      await routeHandler(createMockContext(), request, mockResponse);

      expect(mockEsClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    });

    it('should include deployment metadata in indexed rules', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: {
          rule_ids: ['aesop.exploration.failure_rate_high'],
        },
      });

      await routeHandler(createMockContext(), request, mockResponse);

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.aesop-alert-rules',
          id: 'aesop.exploration.failure_rate_high',
          document: expect.objectContaining({
            id: 'aesop.exploration.failure_rate_high',
            deployed_at: expect.any(String),
            deployed_by: 'system',
          }),
        })
      );
    });

    it('should handle Elasticsearch errors gracefully', async () => {
      mockEsClient.indices.existsIndexTemplate.mockRejectedValue(
        new Error('Elasticsearch unavailable')
      );

      const request = httpServerMock.createKibanaRequest({
        body: {},
      });

      await routeHandler(createMockContext(), request, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          body: expect.objectContaining({
            message: expect.stringContaining('Failed to deploy alerting rules'),
          }),
        })
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AESOP Alerting] Failed to deploy alerting rules'),
        expect.anything()
      );
    });
  });
});
