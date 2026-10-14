/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyDeprecations, configDeprecationFactory } from '@kbn/config';
import { configDeprecationsMock } from '@kbn/core/server/mocks';
import { config } from './config';

const CONFIG_PATH = 'xpack.searchInferenceEndpoints';

const applyConfigDeprecations = (settings: Record<string, unknown> = {}) => {
  const deprecationContext = configDeprecationsMock.createContext();
  const deprecations = config.deprecations?.(configDeprecationFactory) ?? [];
  const deprecationMessages: string[] = [];
  const { config: migrated } = applyDeprecations(
    { xpack: { searchInferenceEndpoints: settings } },
    deprecations.map((deprecation) => ({
      deprecation,
      path: CONFIG_PATH,
      context: deprecationContext,
    })),
    () =>
      ({ message }) =>
        deprecationMessages.push(message)
  );
  return { messages: deprecationMessages, migrated };
};

describe('config deprecations', () => {
  it('removes the unused dynamicConnectors settings and warns about each one', () => {
    const { messages, migrated } = applyConfigDeprecations({
      enabled: true,
      dynamicConnectors: { enabled: true, pollingIntervalMins: 30 },
    });

    expect(messages).toEqual([
      expect.stringContaining(`${CONFIG_PATH}.dynamicConnectors.enabled`),
      expect.stringContaining(`${CONFIG_PATH}.dynamicConnectors.pollingIntervalMins`),
    ]);
    expect(migrated.xpack.searchInferenceEndpoints).toEqual({ enabled: true });
    expect(() => config.schema.validate(migrated.xpack.searchInferenceEndpoints)).not.toThrow();
  });

  it('does not warn when dynamicConnectors is not set', () => {
    const { messages } = applyConfigDeprecations({ enabled: true });

    expect(messages).toEqual([]);
  });
});
