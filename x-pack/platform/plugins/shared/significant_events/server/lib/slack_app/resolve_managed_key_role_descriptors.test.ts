/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ApmSourcesAccessPluginStart } from '@kbn/apm-sources-access-plugin/server';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/server';
import {
  buildManagedKeyRoleDescriptors,
  resolveObservabilityReadPatterns,
} from './resolve_managed_key_role_descriptors';

const soClient = {} as unknown as SavedObjectsClientContract;

const createLogger = (): Logger =>
  ({
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    get: jest.fn(),
  } as unknown as Logger);

const createApmSourcesAccess = (
  getApmIndices: jest.Mock
): ApmSourcesAccessPluginStart => ({ getApmIndices } as unknown as ApmSourcesAccessPluginStart);

const createLogsDataAccess = (getLogSources: jest.Mock): LogsDataAccessPluginStart =>
  ({
    services: {
      logSourcesServiceFactory: {
        getLogSourcesService: jest.fn().mockResolvedValue({ getLogSources }),
      },
    },
  } as unknown as LogsDataAccessPluginStart);

describe('resolveObservabilityReadPatterns', () => {
  it('resolves APM + log patterns from the deployment config and adds static metrics', async () => {
    const getApmIndices = jest.fn().mockResolvedValue({
      transaction: 'traces-apm*,traces-*.otel-*',
      span: 'traces-apm*',
      error: 'logs-apm*,logs-*.otel-*',
      metric: 'metrics-apm*',
    });
    const getLogSources = jest
      .fn()
      .mockResolvedValue([{ indexPattern: 'logs-*' }, { indexPattern: 'my-custom-logs-*' }]);

    const patterns = await resolveObservabilityReadPatterns({
      soClient,
      logger: createLogger(),
      apmSourcesAccess: createApmSourcesAccess(getApmIndices),
      logsDataAccess: createLogsDataAccess(getLogSources),
    });

    // Custom-configured log source is included (the whole point of resolving at runtime).
    expect(patterns).toEqual(expect.arrayContaining(['my-custom-logs-*']));
    expect(patterns).toEqual(expect.arrayContaining(['traces-apm*', 'logs-apm*', 'metrics-apm*']));
    // Static metrics fallback is always present.
    expect(patterns).toEqual(expect.arrayContaining(['metrics-*', 'metrics-*.otel-*']));
    // Deduplicated + sorted.
    expect(patterns).toEqual([...new Set(patterns)].sort());
  });

  it('falls back to defaults when the data-access plugins are absent', async () => {
    const patterns = await resolveObservabilityReadPatterns({
      soClient,
      logger: createLogger(),
    });

    expect(patterns).toEqual(
      expect.arrayContaining(['apm-*', 'logs-*', 'metrics-*', 'traces-apm*', 'traces-*.otel-*'])
    );
  });

  it('falls back to APM defaults when resolution throws', async () => {
    const getApmIndices = jest.fn().mockRejectedValue(new Error('boom'));
    const logger = createLogger();

    const patterns = await resolveObservabilityReadPatterns({
      soClient,
      logger,
      apmSourcesAccess: createApmSourcesAccess(getApmIndices),
    });

    expect(patterns).toEqual(expect.arrayContaining(['traces-apm*', 'apm-*']));
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe('buildManagedKeyRoleDescriptors', () => {
  it('produces a read-only descriptor with the expected index groups and kibana features', async () => {
    const descriptors = await buildManagedKeyRoleDescriptors({
      soClient,
      logger: createLogger(),
    });
    const descriptor = descriptors.nightshift_relay_agent_builder;

    expect(descriptor.elasticsearch.cluster).toEqual(['monitor_inference']);

    const privileges = descriptor.elasticsearch.indices!.flatMap((entry) => entry.privileges);
    expect(new Set(privileges)).toEqual(new Set(['read', 'view_index_metadata']));

    const names = descriptor.elasticsearch.indices!.flatMap((entry) => entry.names);
    expect(names).toEqual(
      expect.arrayContaining([
        '.significant_events*',
        '.kibana_streams*',
        '.alerts-streams.alerts-*',
        '.rule-events*',
        'code-*',
        'code-history-*',
      ])
    );

    expect(descriptor.kibana).toEqual([
      {
        spaces: ['*'],
        feature: {
          agentBuilder: ['read'],
          actions: ['read'],
          workflowsManagement: ['read'],
        },
      },
    ]);
  });
});
