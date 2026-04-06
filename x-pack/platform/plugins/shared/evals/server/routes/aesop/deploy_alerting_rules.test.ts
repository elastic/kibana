/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tests for AESOP Alerting Rules Deployment Route
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { registerDeployAlertingRulesRoute } from './deploy_alerting_rules';
import { ALERTING_RULES } from '../../lib/aesop/monitoring/alerting_rules';
import type { EvalsRequestHandlerContext } from '../../types';

describe('Deploy Alerting Rules Route', () => {
  let mockRouter: ReturnType<typeof httpServerMock.createRouter>;
  let mockContext: EvalsRequestHandlerContext;

  beforeEach(() => {
    mockRouter = httpServerMock.createRouter();
    mockContext = {
      core: {
        elasticsearch: {
          client: {
            asCurrentUser: {
              index: jest.fn().mockResolvedValue({ _id: 'test' }),
              exists: jest.fn().mockResolvedValue(false),
              indices: {
                exists: jest.fn().mockResolvedValue(false),
                existsIndexTemplate: jest.fn().mockResolvedValue(false),
                putIndexTemplate: jest.fn().mockResolvedValue({}),
              },
            },
          },
        },
      },
      logger: {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
      },
    } as any;

    registerDeployAlertingRulesRoute(mockRouter);
  });

  describe('POST /internal/aesop/monitoring/alerts/deploy', () => {
    it('should deploy all rules by default', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: {},
      });

      const response = await mockRouter.getRoutes()[0].handler(mockContext, request, httpServerMock.createResponseFactory());

      expect(response.status).toBe(200);
      expect(response.payload).toMatchObject({
        success: true,
        dry_run: false,
        rule_ids: expect.arrayContaining(ALERTING_RULES.map(r => r.id)),
      });

      // Should have called index template creation
      expect(mockContext.core.elasticsearch.client.asCurrentUser.indices.putIndexTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'aesop-alert-rules-template',
          index_patterns: ['.aesop-alert-rules'],
        })
      );

      // Should have indexed each rule
      expect(mockContext.core.elasticsearch.client.asCurrentUser.index).toHaveBeenCalledTimes(ALERTING_RULES.length);
    });

    it('should deploy only specified rules', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: {
          rule_ids: ['aesop-exploration-failure-rate', 'aesop-workflow-timeout'],
        },
      });

      const response = await mockRouter.getRoutes()[0].handler(mockContext, request, httpServerMock.createResponseFactory());

      expect(response.status).toBe(200);
      expect(response.payload).toMatchObject({
        success: true,
        rule_ids: ['aesop-exploration-failure-rate', 'aesop-workflow-timeout'],
      });

      // Should have indexed only 2 rules
      expect(mockContext.core.elasticsearch.client.asCurrentUser.index).toHaveBeenCalledTimes(2);
    });

    it('should return preview in dry run mode', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: {
          dry_run: true,
        },
      });

      const response = await mockRouter.getRoutes()[0].handler(mockContext, request, httpServerMock.createResponseFactory());

      expect(response.status).toBe(200);
      expect(response.payload).toMatchObject({
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
            rule_type: expect.stringMatching(/threshold|anomaly/),
          }),
        ]),
      });

      // Should not have called index
      expect(mockContext.core.elasticsearch.client.asCurrentUser.index).not.toHaveBeenCalled();
    });

    it('should skip existing rules when overwrite is false', async () => {
      // Mock existing rule
      mockContext.core.elasticsearch.client.asCurrentUser.exists.mockResolvedValue(true);

      const request = httpServerMock.createKibanaRequest({
        body: {
          overwrite: false,
          rule_ids: ['aesop-exploration-failure-rate'],
        },
      });

      const response = await mockRouter.getRoutes()[0].handler(mockContext, request, httpServerMock.createResponseFactory());

      expect(response.status).toBe(200);
      expect(response.payload).toMatchObject({
        success: true,
        rules_created: 0,
        rules_updated: 0,
        rules_skipped: 1,
      });

      // Should not have indexed (rule was skipped)
      expect(mockContext.core.elasticsearch.client.asCurrentUser.index).not.toHaveBeenCalled();
    });

    it('should update existing rules when overwrite is true', async () => {
      // Mock existing rule
      mockContext.core.elasticsearch.client.asCurrentUser.exists.mockResolvedValue(true);

      const request = httpServerMock.createKibanaRequest({
        body: {
          overwrite: true,
          rule_ids: ['aesop-exploration-failure-rate'],
        },
      });

      const response = await mockRouter.getRoutes()[0].handler(mockContext, request, httpServerMock.createResponseFactory());

      expect(response.status).toBe(200);
      expect(response.payload).toMatchObject({
        success: true,
        rules_created: 0,
        rules_updated: 1,
        rules_skipped: 0,
      });

      // Should have indexed (updated rule)
      expect(mockContext.core.elasticsearch.client.asCurrentUser.index).toHaveBeenCalledTimes(1);
    });

    it('should return bad request for invalid rule IDs', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: {
          rule_ids: ['invalid-rule-id'],
        },
      });

      const response = await mockRouter.getRoutes()[0].handler(mockContext, request, httpServerMock.createResponseFactory());

      expect(response.status).toBe(400);
      expect(response.payload).toMatchObject({
        message: expect.stringContaining('No matching rules found'),
      });
    });

    it('should handle partial failures gracefully', async () => {
      // First rule succeeds, second fails
      mockContext.core.elasticsearch.client.asCurrentUser.index
        .mockResolvedValueOnce({ _id: 'success' } as any)
        .mockRejectedValueOnce(new Error('Index failure'));

      const request = httpServerMock.createKibanaRequest({
        body: {
          rule_ids: [
            'aesop-exploration-failure-rate',
            'aesop-workflow-timeout',
          ],
        },
      });

      const response = await mockRouter.getRoutes()[0].handler(mockContext, request, httpServerMock.createResponseFactory());

      expect(response.status).toBe(200);
      expect(response.payload).toMatchObject({
        success: false, // Has errors
        rules_created: 1,
        errors: expect.arrayContaining([
          expect.objectContaining({
            rule_id: 'aesop-workflow-timeout',
            error: 'Index failure',
          }),
        ]),
      });
    });

    it('should create index template if it does not exist', async () => {
      mockContext.core.elasticsearch.client.asCurrentUser.indices.existsIndexTemplate.mockResolvedValue(false);

      const request = httpServerMock.createKibanaRequest({
        body: {
          rule_ids: ['aesop-exploration-failure-rate'],
        },
      });

      await mockRouter.getRoutes()[0].handler(mockContext, request, httpServerMock.createResponseFactory());

      expect(mockContext.core.elasticsearch.client.asCurrentUser.indices.putIndexTemplate).toHaveBeenCalledWith(
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
      mockContext.core.elasticsearch.client.asCurrentUser.indices.existsIndexTemplate.mockResolvedValue(true);

      const request = httpServerMock.createKibanaRequest({
        body: {
          rule_ids: ['aesop-exploration-failure-rate'],
        },
      });

      await mockRouter.getRoutes()[0].handler(mockContext, request, httpServerMock.createResponseFactory());

      expect(mockContext.core.elasticsearch.client.asCurrentUser.indices.putIndexTemplate).not.toHaveBeenCalled();
    });

    it('should include deployment metadata in indexed rules', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: {
          rule_ids: ['aesop-exploration-failure-rate'],
        },
      });

      await mockRouter.getRoutes()[0].handler(mockContext, request, httpServerMock.createResponseFactory());

      expect(mockContext.core.elasticsearch.client.asCurrentUser.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.aesop-alert-rules',
          id: 'aesop-exploration-failure-rate',
          document: expect.objectContaining({
            id: 'aesop-exploration-failure-rate',
            deployed_at: expect.any(String),
            deployed_by: 'system',
          }),
        })
      );
    });

    it('should handle Elasticsearch errors gracefully', async () => {
      mockContext.core.elasticsearch.client.asCurrentUser.indices.existsIndexTemplate.mockRejectedValue(
        new Error('Elasticsearch unavailable')
      );

      const request = httpServerMock.createKibanaRequest({
        body: {},
      });

      const response = await mockRouter.getRoutes()[0].handler(mockContext, request, httpServerMock.createResponseFactory());

      expect(response.status).toBe(500);
      expect(response.payload).toMatchObject({
        message: expect.stringContaining('Failed to deploy alerting rules'),
      });

      expect(mockContext.logger.error).toHaveBeenCalledWith(
        '[AESOP Alerting] Failed to deploy alerting rules',
        expect.anything()
      );
    });
  });
});
