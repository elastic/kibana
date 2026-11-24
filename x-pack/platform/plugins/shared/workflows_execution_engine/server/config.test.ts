/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyDeprecations, configDeprecationFactory } from '@kbn/config';
import { configDeprecationsMock } from '@kbn/core/server/mocks';

import { config } from './config';

const deprecationContext = configDeprecationsMock.createContext();

const applyConfigDeprecations = (settings: Record<string, unknown>) => {
  if (!config.deprecations) {
    throw new Error('workflows execution engine config has no deprecations');
  }
  const deprecations = config.deprecations(configDeprecationFactory);
  const deprecationMessages: string[] = [];
  const migrated = applyDeprecations(
    settings,
    deprecations.map((deprecation) => ({
      deprecation,
      path: 'workflowsExecutionEngine',
      context: deprecationContext,
    })),
    () =>
      ({ message }) =>
        deprecationMessages.push(message)
  );
  return {
    messages: deprecationMessages,
    migrated: migrated.config,
  };
};

describe('workflows execution engine config deprecations', () => {
  it('leaves eviction.minPayloadSize in place', () => {
    const settings = {
      workflowsExecutionEngine: {
        eviction: {
          maxCacheSize: '50mb',
          minPayloadSize: '100kb',
        },
      },
    };
    const { messages, migrated } = applyConfigDeprecations(settings);

    expect(migrated).toEqual(settings);
    expect(messages).toEqual([]);
  });
});
