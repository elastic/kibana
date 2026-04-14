/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStubDataView } from '@kbn/data-views-plugin/common/mocks';
import { createActor, fromPromise, waitFor } from 'xstate';
import type { LogsOverviewFeatureFlags } from '../../types';
import type {
  LogsSourceConfiguration,
  ResolvedIndexNameLogsSourceConfiguration,
} from '../../utils/logs_source';
import type { MlCapabilities } from '../../utils/ml_capabilities';
import { logsOverviewStateMachine } from './logs_overview_state_provider';

describe('logsOverviewStateMachine', () => {
  const featureFlags: LogsOverviewFeatureFlags = { isPatternsEnabled: true };
  const logsSource: LogsSourceConfiguration = {
    type: 'index_name',
    indexName: 'logs-test-*',
    messageField: 'message',
    timestampField: '@timestamp',
  };
  const resolvedLogsSource: ResolvedIndexNameLogsSourceConfiguration = {
    ...logsSource,
    dataView: createStubDataView({
      spec: { title: 'logs-test-*', timeFieldName: '@timestamp' },
    }),
  };
  const availableMlCapabilities: MlCapabilities = { status: 'available' } as MlCapabilities;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show log events after resolving logsSource and mlCapabilities', async () => {
    const actor = createActor(
      logsOverviewStateMachine.provide({
        actors: {
          resolveLogsSource: fromPromise(async () => resolvedLogsSource),
          loadMlCapabilities: fromPromise(async () => availableMlCapabilities),
        },
      }),
      { input: { featureFlags, logsSource } }
    );

    actor.start();
    await waitFor(actor, (state) => state.matches('showingLogEvents'));

    expect(actor.getSnapshot().context.logsSource).toEqual({
      status: 'resolved',
      value: resolvedLogsSource,
    });
    expect(actor.getSnapshot().context.mlCapabilities).toEqual(availableMlCapabilities);
  });

  it('should go to a failed state when an error occurs in resolveLogsSource', async () => {
    const error = new Error('resolve error');

    const actor = createActor(
      logsOverviewStateMachine.provide({
        actors: {
          resolveLogsSource: fromPromise(async () => {
            throw error;
            return resolvedLogsSource; // This line won't be reached, but is here to satisfy the type checker
          }),
          loadMlCapabilities: fromPromise(async () => availableMlCapabilities),
        },
      }),
      { input: { featureFlags, logsSource } }
    );

    actor.start();
    await waitFor(actor, (state) => state.matches('failedToInitialize'));

    expect(actor.getSnapshot().context.error).toEqual(error);
  });

  it('should continue to load when an error occurs in loadMlCapabilities', async () => {
    const error = new Error('ml error');
    const actor = createActor(
      logsOverviewStateMachine.provide({
        actors: {
          resolveLogsSource: fromPromise(async () => resolvedLogsSource),
          loadMlCapabilities: fromPromise(async () => {
            throw error;
            return availableMlCapabilities; // This line won't be reached, but is here to satisfy the
          }),
        },
      }),
      { input: { featureFlags, logsSource } }
    );

    actor.start();
    await waitFor(actor, (state) => state.matches('showingLogEvents'));

    expect(actor.getSnapshot().can({ type: 'SHOW_LOG_CATEGORIES' })).toBe(false);
    expect(actor.getSnapshot().context.error).toEqual(error);
    expect(actor.getSnapshot().context.logsSource).toEqual({
      status: 'resolved',
      value: resolvedLogsSource,
    });
  });

  it('should transition to showingLogCategories if ml is available', async () => {
    const actor = createActor(
      logsOverviewStateMachine.provide({
        actors: {
          resolveLogsSource: fromPromise(async () => resolvedLogsSource),
          loadMlCapabilities: fromPromise(async () => availableMlCapabilities),
        },
      }),
      { input: { featureFlags, logsSource } }
    );

    actor.start();
    await waitFor(actor, (state) => state.matches('showingLogEvents'));

    expect(actor.getSnapshot().can({ type: 'SHOW_LOG_CATEGORIES' })).toBe(true);

    actor.send({ type: 'SHOW_LOG_CATEGORIES' });

    expect(actor.getSnapshot().matches('showingLogCategories')).toBe(true);
  });

  it('should not transition to showingLogCategories if ml is not available', async () => {
    const unavailableMl: MlCapabilities = {
      status: 'unavailable',
      reason: 'disabled',
    } as MlCapabilities;
    const actor = createActor(
      logsOverviewStateMachine.provide({
        actors: {
          resolveLogsSource: fromPromise(async () => resolvedLogsSource),
          loadMlCapabilities: fromPromise(async () => unavailableMl),
        },
      }),
      { input: { featureFlags, logsSource } }
    );

    actor.start();
    await waitFor(actor, (state) => state.matches('showingLogEvents'));

    expect(actor.getSnapshot().can({ type: 'SHOW_LOG_CATEGORIES' })).toBe(false);
  });
});
