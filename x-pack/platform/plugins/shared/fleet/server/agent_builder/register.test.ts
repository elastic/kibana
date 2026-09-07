/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { registerFleetAgentBuilder } from './register';

describe('registerFleetAgentBuilder', () => {
  const dependencies = {
    getPackageService: jest.fn(),
    getPackagePolicyService: jest.fn(),
    getAuthz: jest.fn(),
    logger: loggingSystemMock.createLogger(),
  };

  it('registers the Fleet integration details tool when Agent Builder is available', () => {
    const register = jest.fn();

    registerFleetAgentBuilder({
      ...dependencies,
      agentBuilder: { tools: { register } } as unknown as AgentBuilderPluginSetup,
    });

    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'platform.fleet.get_integration_details' })
    );
  });

  it('does nothing when Agent Builder is unavailable', () => {
    expect(() => registerFleetAgentBuilder(dependencies)).not.toThrow();
  });
});
