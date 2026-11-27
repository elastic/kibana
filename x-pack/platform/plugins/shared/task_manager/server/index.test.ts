/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from '.';
import { applyDeprecations, configDeprecationFactory } from '@kbn/config';
import { configDeprecationsMock } from '@kbn/core/server/mocks';

const CONFIG_PATH = 'xpack.task_manager';

const deprecationContext = configDeprecationsMock.createContext();

const applyTaskManagerDeprecations = (settings: Record<string, unknown> = {}) => {
  const deprecations = config.deprecations!(configDeprecationFactory);
  const deprecationMessages: string[] = [];
  const _config = {
    xpack: { task_manager: settings },
  };
  const { config: migrated } = applyDeprecations(
    _config,
    deprecations.map((deprecation) => ({
      deprecation,
      path: CONFIG_PATH,
      context: deprecationContext,
    })),
    () =>
      ({ message }) =>
        deprecationMessages.push(message)
  );
  return {
    messages: deprecationMessages,
    migrated,
  };
};

describe('deprecations', () => {
  it('logs a warning if max_workers is over limit', () => {
    const { messages } = applyTaskManagerDeprecations({ max_workers: 1000 });
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "Configuring \\"xpack.task_manager.max_workers\\" is deprecated and will be removed in a future version. Remove this setting and use \\"xpack.task_manager.capacity\\" instead.",
        "setting \\"xpack.task_manager.max_workers\\" (1000) greater than 100 is deprecated.",
      ]
    `);
  });

  it.each([true, false])(
    'logs a warning if unsafe.authenticate_background_task_utilization is set to %s',
    (value) => {
      const { messages, migrated } = applyTaskManagerDeprecations({
        unsafe: { authenticate_background_task_utilization: value },
      });
      expect(messages).toMatchInlineSnapshot(`
        Array [
          "Configuring \\"xpack.task_manager.unsafe.authenticate_background_task_utilization\\" is deprecated and will be removed in 10.0.0. Remove this setting; the background task utilization API will always require authentication.",
        ]
      `);
      expect(migrated.xpack.task_manager.unsafe.authenticate_background_task_utilization).toBe(
        value
      );
    }
  );

  it('does not log a warning if unsafe.authenticate_background_task_utilization is not set', () => {
    const { messages } = applyTaskManagerDeprecations({
      unsafe: { exclude_task_types: ['foo'] },
    });
    expect(messages).toEqual([]);
  });
});
