/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { validateSettings, validateSettingsWithDryRun } from './validate_settings';

describe('validateSettings', () => {
  it('returns valid when settings are in the serverless allowlist', () => {
    const result = validateSettings({
      settings: { 'index.refresh_interval': { value: '5s' } },
      isServerless: true,
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects disallowed settings in serverless mode', () => {
    const result = validateSettings({
      settings: {
        'index.refresh_interval': { value: '5s' },
        'index.number_of_replicas': { value: 2 },
        'index.number_of_shards': { value: 3 },
      },
      isServerless: true,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].message).toContain('index.number_of_replicas');
    expect(result.errors[0].message).toContain('not allowed in serverless');
    expect(result.errors[1].message).toContain('index.number_of_shards');
  });

  it('allows all settings in non-serverless mode', () => {
    const result = validateSettings({
      settings: {
        'index.refresh_interval': { value: '5s' },
        'index.number_of_replicas': { value: 2 },
        'index.number_of_shards': { value: 3 },
      },
      isServerless: false,
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid when settings are empty', () => {
    const result = validateSettings({
      settings: {},
      isServerless: true,
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('validateSettingsWithDryRun', () => {
  let mockScopedClusterClient: jest.Mocked<IScopedClusterClient>;

  beforeEach(() => {
    mockScopedClusterClient = {
      asCurrentUser: {
        indices: {
          putDataStreamSettings: jest.fn(),
        },
      },
    } as unknown as IScopedClusterClient;
  });

  it('does not throw when settings pass dry_run validation', async () => {
    mockScopedClusterClient.asCurrentUser.indices.putDataStreamSettings = jest
      .fn()
      .mockResolvedValue({
        data_streams: [{ name: 'logs-test-default', applied_to_data_stream: true }],
      });

    await expect(
      validateSettingsWithDryRun({
        scopedClusterClient: mockScopedClusterClient,
        streamName: 'logs-test-default',
        settings: { 'index.refresh_interval': { value: '5s' } },
        isServerless: true,
      })
    ).resolves.toBeUndefined();

    expect(
      mockScopedClusterClient.asCurrentUser.indices.putDataStreamSettings
    ).toHaveBeenCalledWith({
      name: 'logs-test-default',
      settings: { 'index.refresh_interval': '5s' },
      dry_run: true,
    });
  });

  it('throws when settings fail dry_run validation', async () => {
    const errorMessage =
      'index setting [index.refresh_interval=1s] should be either -1 or equal to or greater than 5s';
    mockScopedClusterClient.asCurrentUser.indices.putDataStreamSettings = jest
      .fn()
      .mockResolvedValue({
        data_streams: [
          {
            name: 'logs-test-default',
            applied_to_data_stream: false,
            error: errorMessage,
          },
        ],
      });

    await expect(
      validateSettingsWithDryRun({
        scopedClusterClient: mockScopedClusterClient,
        streamName: 'logs-test-default',
        settings: { 'index.refresh_interval': { value: '1s' } },
        isServerless: true,
      })
    ).rejects.toThrow(`Invalid stream settings: ${errorMessage}`);
  });

  it('does not call ES when there are no settings to validate', async () => {
    await expect(
      validateSettingsWithDryRun({
        scopedClusterClient: mockScopedClusterClient,
        streamName: 'logs-test-default',
        settings: {},
        isServerless: true,
      })
    ).resolves.toBeUndefined();

    expect(
      mockScopedClusterClient.asCurrentUser.indices.putDataStreamSettings
    ).not.toHaveBeenCalled();
  });

  it('does not call ES when all settings are null', async () => {
    await expect(
      validateSettingsWithDryRun({
        scopedClusterClient: mockScopedClusterClient,
        streamName: 'logs-test-default',
        settings: { 'index.refresh_interval': { value: null as unknown as string } },
        isServerless: true,
      })
    ).resolves.toBeUndefined();

    expect(
      mockScopedClusterClient.asCurrentUser.indices.putDataStreamSettings
    ).not.toHaveBeenCalled();
  });

  it('sends all settings in non-serverless mode', async () => {
    mockScopedClusterClient.asCurrentUser.indices.putDataStreamSettings = jest
      .fn()
      .mockResolvedValue({
        data_streams: [{ name: 'logs-test-default', applied_to_data_stream: true }],
      });

    await validateSettingsWithDryRun({
      scopedClusterClient: mockScopedClusterClient,
      streamName: 'logs-test-default',
      settings: {
        'index.refresh_interval': { value: '5s' },
        'index.number_of_replicas': { value: 2 },
        'index.number_of_shards': { value: 3 },
      },
      isServerless: false,
    });

    expect(
      mockScopedClusterClient.asCurrentUser.indices.putDataStreamSettings
    ).toHaveBeenCalledWith({
      name: 'logs-test-default',
      settings: {
        'index.refresh_interval': '5s',
        'index.number_of_replicas': 2,
        'index.number_of_shards': 3,
      },
      dry_run: true,
    });
  });
});
