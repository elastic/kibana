/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Streams } from '@kbn/streams-schema';
import { ExecutionPlan } from './execution_plan';
import type { StateDependencies } from '../types';

const streamDefinition: Streams.WiredStream.Definition = {
  type: 'wired',
  name: 'logs.service',
  description: '',
  updated_at: new Date().toISOString(),
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: new Date().toISOString() },
    settings: {},
    wired: {
      fields: {},
      routing: [],
    },
    failure_store: { inherit: {} },
  },
};

const createDependencies = (overrides: Partial<StateDependencies> = {}): StateDependencies =>
  ({
    logger: {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    } as unknown as Logger,
    esClient: {} as StateDependencies['esClient'],
    storageClient: {
      bulk: jest.fn().mockResolvedValue(undefined),
    },
    isServerless: false,
    isSecurityEnabled: false,
    isWiredStreamViewsEnabled: false,
    isDev: true,
    ...overrides,
  } as StateDependencies);

describe('ExecutionPlan Knowledge Indicator cleanup', () => {
  it('no-ops delete_queries and unlink_features when the KI client is unavailable', async () => {
    const dependencies = createDependencies();
    const plan = new ExecutionPlan(dependencies);

    await plan.plan([
      { type: 'delete_queries', request: { definition: streamDefinition } },
      { type: 'unlink_features', request: { name: streamDefinition.name } },
    ]);

    await expect(plan.execute()).resolves.toBeUndefined();

    expect(dependencies.logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Skipping deleteQueries')
    );
    expect(dependencies.logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Skipping unlinkFeatures')
    );
  });

  it('cleans up queries and features when the KI client is available', async () => {
    const deleteAllQueries = jest.fn().mockResolvedValue(undefined);
    const deleteIndicators = jest.fn().mockResolvedValue(undefined);
    const getKnowledgeIndicatorClient = jest.fn().mockResolvedValue({
      deleteAllQueries,
      deleteIndicators,
    });

    const plan = new ExecutionPlan(createDependencies({ getKnowledgeIndicatorClient }));

    await plan.plan([
      { type: 'delete_queries', request: { definition: streamDefinition } },
      { type: 'unlink_features', request: { name: streamDefinition.name } },
    ]);

    await plan.execute();

    expect(deleteAllQueries).toHaveBeenCalledWith(streamDefinition.name);
    expect(deleteIndicators).toHaveBeenCalledWith(streamDefinition.name);
  });
});
