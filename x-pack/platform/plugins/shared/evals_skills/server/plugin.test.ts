/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import type { EvalsPluginSetup } from '@kbn/evals-plugin/server';
import { EvalsSkillsPlugin } from './plugin';
import type { EvalsSkillsSetupDependencies } from './types';

describe('EvalsSkillsPlugin', () => {
  const setup = (evals: Pick<EvalsPluginSetup, 'enabled' | 'mode'>) => {
    const plugin = new EvalsSkillsPlugin(coreMock.createPluginInitializerContext());
    const register = jest.fn();

    plugin.setup(coreMock.createSetup(), {
      agentBuilder: { skills: { register } },
      workflowsManagement: { management: {} },
      evals: { ...evals, registerTaskProvider: jest.fn() },
    } as unknown as EvalsSkillsSetupDependencies);

    return { register };
  };

  it('registers the evals skills when the evals product is loaded', () => {
    const { register } = setup({ enabled: true, mode: 'full' });

    expect(register).toHaveBeenCalledTimes(2);
  });

  it('registers no skills in runtime mode, where the evals routes they call are not loaded', () => {
    const { register } = setup({ enabled: true, mode: 'runtime' });

    expect(register).not.toHaveBeenCalled();
  });

  it('registers no skills when evals is disabled', () => {
    const { register } = setup({ enabled: false, mode: 'full' });

    expect(register).not.toHaveBeenCalled();
  });
});
