/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import { createRouteDependencies } from '../test_utils';
import { GetRulesConfigRoute } from './get_rules_config_route';
import type { PluginConfig } from '../../config';

const createConfigAccessor = (
  config: PluginConfig
): PluginInitializerContext<PluginConfig>['config'] =>
  ({
    get: jest.fn().mockReturnValue(config),
  } as unknown as PluginInitializerContext<PluginConfig>['config']);

describe('GetRulesConfigRoute', () => {
  it('returns the configured minimumScheduleInterval', async () => {
    const { ctx } = createRouteDependencies();
    const configAccessor = createConfigAccessor({
      rules: { minimumScheduleInterval: '1m' },
    } as PluginConfig);

    const route = new GetRulesConfigRoute(ctx, configAccessor);

    await route.handle();

    expect(ctx.response.ok).toHaveBeenCalledWith({
      body: { minimumScheduleInterval: '1m' },
    });
  });

  it('reflects a non-default configured minimumScheduleInterval', async () => {
    const { ctx } = createRouteDependencies();
    const configAccessor = createConfigAccessor({
      rules: { minimumScheduleInterval: '5m' },
    } as PluginConfig);

    const route = new GetRulesConfigRoute(ctx, configAccessor);

    await route.handle();

    expect(ctx.response.ok).toHaveBeenCalledWith({
      body: { minimumScheduleInterval: '5m' },
    });
  });
});
