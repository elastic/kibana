/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import type { PackageClient } from '@kbn/fleet-plugin/server';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import type { Feature } from '@kbn/streams-schema';
import type { FeatureClient } from '../feature/feature_client';
import { IntegrationSuggestionService } from './integration_suggestion_service';

describe('IntegrationSuggestionService', () => {
  let logger: MockedLogger;
  let featureClientMock: jest.Mocked<FeatureClient>;
  let packageClientMock: jest.Mocked<PackageClient>;
  let service: IntegrationSuggestionService;
  let abortController: AbortController;

  const createFeature = (overrides: Partial<Feature> = {}): Feature => ({
    uuid: 'test-uuid',
    id: 'test-feature',
    stream_name: 'logs-test-default',
    type: 'technology',
    subtype: 'database_engine',
    description: 'A test database feature',
    properties: {},
    confidence: 85,
    status: 'active',
    last_seen: new Date().toISOString(),
    ...overrides,
  });

  const createPackageListItem = (
    overrides: Partial<PackageListItem> = {}
  ): PackageListItem =>
    ({
      id: 'test-package',
      name: 'test-package',
      title: 'Test Package',
      version: '1.0.0',
      type: 'integration',
      status: 'installed',
      description: 'A test package',
      icons: [],
      ...overrides,
    } as PackageListItem);

  beforeEach(() => {
    logger = loggerMock.create();
    abortController = new AbortController();

    featureClientMock = {
      getFeatures: jest.fn(),
    } as unknown as jest.Mocked<FeatureClient>;

    packageClientMock = {
      getPackages: jest.fn(),
      getAgentPolicyConfigYAML: jest.fn(),
    } as unknown as jest.Mocked<PackageClient>;

    service = new IntegrationSuggestionService({
      logger,
    });
  });

  describe('getSuggestions', () => {
    const callGetSuggestions = (
      streamName: string,
      featureClient: jest.Mocked<FeatureClient>,
      packageClient: jest.Mocked<PackageClient> | undefined
    ) =>
      service.getSuggestions({
        streamName,
        featureClient,
        packageClient,
        signal: abortController.signal,
      });

    it('returns empty suggestions when no features exist', async () => {
      featureClientMock.getFeatures.mockResolvedValue({ hits: [], total: 0 });

      const result = await callGetSuggestions(
        'logs-test-default',
        featureClientMock,
        packageClientMock
      );

      expect(result).toEqual({
        streamName: 'logs-test-default',
        suggestions: [],
      });
    });

    it('filters out features below confidence threshold', async () => {
      featureClientMock.getFeatures.mockResolvedValue({
        hits: [
          createFeature({ confidence: 75, properties: { technology: 'mysql' } }),
          createFeature({ confidence: 50, properties: { technology: 'nginx' } }),
        ],
        total: 2,
      });

      const result = await callGetSuggestions(
        'logs-test-default',
        featureClientMock,
        packageClientMock
      );

      expect(result.suggestions).toHaveLength(0);
    });

    it('matches feature with technology property to integration', async () => {
      featureClientMock.getFeatures.mockResolvedValue({
        hits: [
          createFeature({
            id: 'mysql-feature',
            title: 'MySQL Database',
            confidence: 90,
            properties: { technology: 'mysql' },
          }),
        ],
        total: 1,
      });

      packageClientMock.getPackages.mockResolvedValue([
        createPackageListItem({
          name: 'mysql_otel',
          title: 'MySQL (OTel)',
          version: '2.0.0',
        }),
      ]);

      packageClientMock.getAgentPolicyConfigYAML.mockResolvedValue(`
receivers:
  mysqlreceiver/mysql:
    endpoint: localhost:3306
service:
  pipelines:
    metrics:
      receivers: [mysqlreceiver/mysql]
`);

      const result = await callGetSuggestions(
        'logs-test-default',
        featureClientMock,
        packageClientMock
      );

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0]).toMatchObject({
        packageName: 'mysql_otel',
        packageTitle: 'MySQL (OTel)',
        confidence: 90,
        featureId: 'mysql-feature',
        featureTitle: 'MySQL Database',
        benefits: expect.arrayContaining(['MySQL performance dashboards']),
      });
      expect(result.suggestions[0].otelConfig).toContain('receivers:');
    });

    it('matches feature using alias (postgres -> postgresql)', async () => {
      featureClientMock.getFeatures.mockResolvedValue({
        hits: [
          createFeature({
            id: 'pg-feature',
            confidence: 85,
            properties: { technology: 'postgres' },
          }),
        ],
        total: 1,
      });

      packageClientMock.getPackages.mockResolvedValue([
        createPackageListItem({
          name: 'postgresql_otel',
          title: 'PostgreSQL (OTel)',
        }),
      ]);

      packageClientMock.getAgentPolicyConfigYAML.mockResolvedValue('');

      const result = await callGetSuggestions(
        'logs-test-default',
        featureClientMock,
        packageClientMock
      );

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].packageName).toBe('postgresql_otel');
    });

    it('extracts technology from library property', async () => {
      featureClientMock.getFeatures.mockResolvedValue({
        hits: [
          createFeature({
            id: 'nginx-feature',
            type: 'technology',
            subtype: 'web_server',
            confidence: 88,
            properties: { library: 'nginx' },
          }),
        ],
        total: 1,
      });

      packageClientMock.getPackages.mockResolvedValue([
        createPackageListItem({
          name: 'nginx_otel',
          title: 'Nginx (OTel)',
        }),
      ]);

      packageClientMock.getAgentPolicyConfigYAML.mockResolvedValue('');

      const result = await callGetSuggestions(
        'logs-test-default',
        featureClientMock,
        packageClientMock
      );

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].packageName).toBe('nginx_otel');
    });

    it('extracts technology from name property for entity features', async () => {
      featureClientMock.getFeatures.mockResolvedValue({
        hits: [
          createFeature({
            id: 'redis-entity',
            type: 'entity',
            subtype: 'database',
            confidence: 92,
            properties: { name: 'redis-cache', technology: 'redis' },
          }),
        ],
        total: 1,
      });

      packageClientMock.getPackages.mockResolvedValue([
        createPackageListItem({
          name: 'redis_otel',
          title: 'Redis (OTel)',
        }),
      ]);

      packageClientMock.getAgentPolicyConfigYAML.mockResolvedValue('');

      const result = await callGetSuggestions(
        'logs-test-default',
        featureClientMock,
        packageClientMock
      );

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].packageName).toBe('redis_otel');
    });

    it('skips suggestions for packages not in registry', async () => {
      featureClientMock.getFeatures.mockResolvedValue({
        hits: [
          createFeature({
            confidence: 90,
            properties: { technology: 'mysql' },
          }),
        ],
        total: 1,
      });

      // Return empty packages list - no packages available
      packageClientMock.getPackages.mockResolvedValue([]);

      const result = await callGetSuggestions(
        'logs-test-default',
        featureClientMock,
        packageClientMock
      );

      expect(result.suggestions).toHaveLength(0);
    });

    it('falls back to non-otel package name when _otel version not found', async () => {
      featureClientMock.getFeatures.mockResolvedValue({
        hits: [
          createFeature({
            confidence: 85,
            properties: { technology: 'kafka' },
          }),
        ],
        total: 1,
      });

      // Only kafka package exists, not kafka_otel
      packageClientMock.getPackages.mockResolvedValue([
        createPackageListItem({
          name: 'kafka',
          title: 'Kafka',
        }),
      ]);

      packageClientMock.getAgentPolicyConfigYAML.mockResolvedValue('');

      const result = await callGetSuggestions(
        'logs-test-default',
        featureClientMock,
        packageClientMock
      );

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].packageName).toBe('kafka');
    });

    it('deduplicates multiple features matching same package', async () => {
      featureClientMock.getFeatures.mockResolvedValue({
        hits: [
          createFeature({
            id: 'mysql-1',
            confidence: 90,
            properties: { technology: 'mysql' },
          }),
          createFeature({
            id: 'mysql-2',
            confidence: 85,
            properties: { library: 'mysql' },
          }),
        ],
        total: 2,
      });

      packageClientMock.getPackages.mockResolvedValue([
        createPackageListItem({
          name: 'mysql_otel',
          title: 'MySQL (OTel)',
        }),
      ]);

      packageClientMock.getAgentPolicyConfigYAML.mockResolvedValue('');

      const result = await callGetSuggestions(
        'logs-test-default',
        featureClientMock,
        packageClientMock
      );

      // Should only return one suggestion for mysql
      expect(result.suggestions).toHaveLength(1);
      // Should use the first (higher confidence) match
      expect(result.suggestions[0].confidence).toBe(90);
    });

    it('returns multiple suggestions for different technologies', async () => {
      featureClientMock.getFeatures.mockResolvedValue({
        hits: [
          createFeature({
            id: 'mysql-feature',
            confidence: 90,
            properties: { technology: 'mysql' },
          }),
          createFeature({
            id: 'nginx-feature',
            confidence: 85,
            properties: { technology: 'nginx' },
          }),
        ],
        total: 2,
      });

      packageClientMock.getPackages.mockResolvedValue([
        createPackageListItem({ name: 'mysql_otel', title: 'MySQL (OTel)' }),
        createPackageListItem({ name: 'nginx_otel', title: 'Nginx (OTel)' }),
      ]);

      packageClientMock.getAgentPolicyConfigYAML.mockResolvedValue('');

      const result = await callGetSuggestions(
        'logs-test-default',
        featureClientMock,
        packageClientMock
      );

      expect(result.suggestions).toHaveLength(2);
      // Should be sorted by confidence descending
      expect(result.suggestions[0].packageName).toBe('mysql_otel');
      expect(result.suggestions[1].packageName).toBe('nginx_otel');
    });

    it('handles missing Fleet gracefully', async () => {
      featureClientMock.getFeatures.mockResolvedValue({
        hits: [
          createFeature({
            id: 'mysql-feature',
            title: 'MySQL Database',
            confidence: 90,
            properties: { technology: 'mysql' },
          }),
        ],
        total: 1,
      });

      // Pass undefined for packageClient (Fleet not available)
      const result = await callGetSuggestions(
        'logs-test-default',
        featureClientMock,
        undefined
      );

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0]).toMatchObject({
        packageName: 'mysql_otel',
        confidence: 90,
        featureId: 'mysql-feature',
      });
      // No OTel config without Fleet
      expect(result.suggestions[0].otelConfig).toBeUndefined();
    });

    it('only fetches entity and technology feature types', async () => {
      featureClientMock.getFeatures.mockResolvedValue({ hits: [], total: 0 });

      await callGetSuggestions('logs-test-default', featureClientMock, packageClientMock);

      // Should call getFeatures twice - once for 'entity', once for 'technology'
      expect(featureClientMock.getFeatures).toHaveBeenCalledTimes(2);
      expect(featureClientMock.getFeatures).toHaveBeenCalledWith('logs-test-default', {
        type: ['entity'],
      });
      expect(featureClientMock.getFeatures).toHaveBeenCalledWith('logs-test-default', {
        type: ['technology'],
      });
    });

    it('skips OTel config that does not contain receivers section', async () => {
      featureClientMock.getFeatures.mockResolvedValue({
        hits: [
          createFeature({
            confidence: 90,
            properties: { technology: 'mysql' },
          }),
        ],
        total: 1,
      });

      packageClientMock.getPackages.mockResolvedValue([
        createPackageListItem({ name: 'mysql_otel', title: 'MySQL (OTel)' }),
      ]);

      // Return a non-OTel config (standard Elastic Agent format)
      packageClientMock.getAgentPolicyConfigYAML.mockResolvedValue(`
inputs:
  - type: mysql
    streams:
      - data_stream:
          dataset: mysql.status
`);

      const result = await callGetSuggestions(
        'logs-test-default',
        featureClientMock,
        packageClientMock
      );

      expect(result.suggestions).toHaveLength(1);
      // OTel config should be undefined since the YAML wasn't OTel format
      expect(result.suggestions[0].otelConfig).toBeUndefined();
    });

    it('handles getAgentPolicyConfigYAML errors gracefully', async () => {
      featureClientMock.getFeatures.mockResolvedValue({
        hits: [
          createFeature({
            confidence: 90,
            properties: { technology: 'mysql' },
          }),
        ],
        total: 1,
      });

      packageClientMock.getPackages.mockResolvedValue([
        createPackageListItem({ name: 'mysql_otel', title: 'MySQL (OTel)' }),
      ]);

      packageClientMock.getAgentPolicyConfigYAML.mockRejectedValue(
        new Error('Package config not found')
      );

      const result = await callGetSuggestions(
        'logs-test-default',
        featureClientMock,
        packageClientMock
      );

      // Should still return the suggestion, just without OTel config
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].otelConfig).toBeUndefined();
    });

    it('includes benefits and docsUrl in suggestions', async () => {
      featureClientMock.getFeatures.mockResolvedValue({
        hits: [
          createFeature({
            confidence: 90,
            properties: { technology: 'nginx' },
          }),
        ],
        total: 1,
      });

      packageClientMock.getPackages.mockResolvedValue([
        createPackageListItem({ name: 'nginx_otel', title: 'Nginx (OTel)' }),
      ]);

      packageClientMock.getAgentPolicyConfigYAML.mockResolvedValue('');

      const result = await callGetSuggestions(
        'logs-test-default',
        featureClientMock,
        packageClientMock
      );

      expect(result.suggestions[0].benefits).toContain('Nginx access and error dashboards');
      expect(result.suggestions[0].docsUrl).toBe('https://docs.elastic.co/integrations/nginx');
    });

    it('uses feature id as title when title is not provided', async () => {
      featureClientMock.getFeatures.mockResolvedValue({
        hits: [
          createFeature({
            id: 'mysql-db-entity',
            title: undefined,
            confidence: 90,
            properties: { technology: 'mysql' },
          }),
        ],
        total: 1,
      });

      packageClientMock.getPackages.mockResolvedValue([
        createPackageListItem({ name: 'mysql_otel', title: 'MySQL (OTel)' }),
      ]);

      packageClientMock.getAgentPolicyConfigYAML.mockResolvedValue('');

      const result = await callGetSuggestions(
        'logs-test-default',
        featureClientMock,
        packageClientMock
      );

      expect(result.suggestions[0].featureTitle).toBe('mysql-db-entity');
    });
  });
});
