/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttackDiscoveryGeneration } from './generation.gen';

describe('AttackDiscoveryGeneration schema', () => {
  const baseGeneration = {
    connector_id: 'test-connector',
    discoveries: 3,
    execution_uuid: 'abc-123',
    loading_message: 'Analyzing alerts',
    start: '2024-01-01T00:00:00.000Z',
    status: 'succeeded' as const,
  };

  it('parses a minimal valid generation without error fields', () => {
    const result = AttackDiscoveryGeneration.safeParse(baseGeneration);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error_category).toBeUndefined();
      expect(result.data.failed_workflow_id).toBeUndefined();
    }
  });

  it('parses a generation with error_category', () => {
    const result = AttackDiscoveryGeneration.safeParse({
      ...baseGeneration,
      error_category: 'llm_provider_error',
      status: 'failed',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error_category).toBe('llm_provider_error');
    }
  });

  it('parses a generation with failed_workflow_id', () => {
    const result = AttackDiscoveryGeneration.safeParse({
      ...baseGeneration,
      failed_workflow_id: 'workflow-xyz-456',
      status: 'failed',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.failed_workflow_id).toBe('workflow-xyz-456');
    }
  });

  it('parses a generation with both error_category and failed_workflow_id', () => {
    const result = AttackDiscoveryGeneration.safeParse({
      ...baseGeneration,
      error_category: 'network_error',
      failed_workflow_id: 'workflow-abc-789',
      reason: 'Connection timed out',
      status: 'failed',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error_category).toBe('network_error');
      expect(result.data.failed_workflow_id).toBe('workflow-abc-789');
      expect(result.data.reason).toBe('Connection timed out');
    }
  });

  it('error_category and failed_workflow_id are optional (backward compatible)', () => {
    const withoutErrorFields = {
      connector_id: 'my-connector',
      discoveries: 1,
      execution_uuid: 'exec-001',
      loading_message: 'Done',
      start: '2024-06-01T00:00:00.000Z',
      status: 'succeeded' as const,
    };

    const result = AttackDiscoveryGeneration.safeParse(withoutErrorFields);
    expect(result.success).toBe(true);
  });
});
