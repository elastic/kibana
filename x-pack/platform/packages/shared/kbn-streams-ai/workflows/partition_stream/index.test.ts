/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { Feature } from '@kbn/streams-schema';

/**
 * Tests for the feature serialization logic used in partitionStream.
 * The actual workflow function is tested through integration tests,
 * but this verifies the feature serialization pattern works correctly.
 */
describe('partitionStream feature serialization', () => {
  const sampleFeatures: Feature[] = [
    {
      id: 'feature-1',
      type: 'framework',
      name: 'nodejs',
      description: 'Node.js application framework detected',
      value: { version: '18.x' },
      confidence: 0.95,
      evidence: ['require statement', 'package.json reference'],
      tags: ['backend', 'javascript'],
      meta: { detected_at: '2024-01-01' },
      status: 'active',
      last_seen: '2024-01-15T00:00:00.000Z',
    },
    {
      id: 'feature-2',
      type: 'service',
      name: 'api-gateway',
      description: 'API Gateway service identified',
      value: { endpoints: ['/api/v1', '/api/v2'] },
      confidence: 0.87,
      evidence: ['HTTP routing patterns'],
      tags: ['api', 'gateway'],
      meta: {},
      status: 'stale',
      last_seen: '2024-01-14T00:00:00.000Z',
    },
  ];

  it('should serialize features omitting id, status, last_seen, expires_at, evidence, and meta', () => {
    // This mirrors the serialization pattern used in partitionStream:
    // features: JSON.stringify(features.map((feature) => omit(feature, ['id', 'status', 'last_seen', 'expires_at', 'evidence', 'meta'])))
    const serialized = JSON.stringify(
      sampleFeatures.map((feature) =>
        omit(feature, ['id', 'status', 'last_seen', 'expires_at', 'evidence', 'meta'])
      )
    );

    const parsed = JSON.parse(serialized);

    expect(parsed).toHaveLength(2);

    // Verify first feature - omitted fields should not be present
    expect(parsed[0]).not.toHaveProperty('id');
    expect(parsed[0]).not.toHaveProperty('status');
    expect(parsed[0]).not.toHaveProperty('last_seen');
    expect(parsed[0]).not.toHaveProperty('expires_at');
    expect(parsed[0]).not.toHaveProperty('evidence');
    expect(parsed[0]).not.toHaveProperty('meta');
    // Essential semantic fields should be preserved
    expect(parsed[0]).toHaveProperty('type', 'framework');
    expect(parsed[0]).toHaveProperty('name', 'nodejs');
    expect(parsed[0]).toHaveProperty('description');
    expect(parsed[0]).toHaveProperty('value');
    expect(parsed[0]).toHaveProperty('confidence', 0.95);
    expect(parsed[0]).toHaveProperty('tags');

    // Verify second feature
    expect(parsed[1]).not.toHaveProperty('id');
    expect(parsed[1]).not.toHaveProperty('status');
    expect(parsed[1]).not.toHaveProperty('last_seen');
    expect(parsed[1]).not.toHaveProperty('expires_at');
    expect(parsed[1]).not.toHaveProperty('evidence');
    expect(parsed[1]).not.toHaveProperty('meta');
    expect(parsed[1]).toHaveProperty('type', 'service');
    expect(parsed[1]).toHaveProperty('name', 'api-gateway');
  });

  it('should handle empty features array', () => {
    const emptyFeatures: Feature[] = [];
    const serialized = JSON.stringify(
      emptyFeatures.map((feature) =>
        omit(feature, ['id', 'status', 'last_seen', 'expires_at', 'evidence', 'meta'])
      )
    );

    expect(serialized).toBe('[]');
  });

  it('should preserve nested value objects but omit meta', () => {
    const featureWithComplexValue: Feature[] = [
      {
        id: 'feature-3',
        type: 'database',
        name: 'postgresql',
        description: 'PostgreSQL database detected',
        value: {
          version: '14.x',
          config: {
            host: 'localhost',
            port: 5432,
          },
        },
        confidence: 0.92,
        evidence: ['connection string'],
        tags: ['database', 'sql'],
        meta: { tables: ['users', 'orders'] },
        status: 'active',
        last_seen: '2024-01-15T00:00:00.000Z',
      },
    ];

    const serialized = JSON.stringify(
      featureWithComplexValue.map((feature) =>
        omit(feature, ['id', 'status', 'last_seen', 'expires_at', 'evidence', 'meta'])
      )
    );

    const parsed = JSON.parse(serialized);

    expect(parsed[0].value).toEqual({
      version: '14.x',
      config: {
        host: 'localhost',
        port: 5432,
      },
    });
    // meta should be omitted
    expect(parsed[0]).not.toHaveProperty('meta');
    expect(parsed[0]).not.toHaveProperty('evidence');
  });

  it('should omit evidence arrays', () => {
    const serialized = JSON.stringify(
      sampleFeatures.map((feature) =>
        omit(feature, ['id', 'status', 'last_seen', 'expires_at', 'evidence', 'meta'])
      )
    );

    const parsed = JSON.parse(serialized);

    // Evidence should be omitted as it's internal/operational data
    expect(parsed[0]).not.toHaveProperty('evidence');
    expect(parsed[1]).not.toHaveProperty('evidence');
  });

  it('should result in valid JSON that can be embedded in prompts', () => {
    const serialized = JSON.stringify(
      sampleFeatures.map((feature) =>
        omit(feature, ['id', 'status', 'last_seen', 'expires_at', 'evidence', 'meta'])
      )
    );

    // The serialized string should be valid JSON
    expect(() => JSON.parse(serialized)).not.toThrow();

    // The serialized string should be embeddable in a prompt template
    const promptContent = `Features:\n${serialized}`;
    expect(promptContent).toContain('Features:');
    expect(promptContent).toContain('framework');
    expect(promptContent).toContain('nodejs');
  });
});
