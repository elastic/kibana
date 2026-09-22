/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerDeductiveAgent } from './register_deductive_agent';

const setup = () => {
  const registerGlobal = jest.fn();
  const register = jest.fn();
  const agents = {
    register,
    registerType: jest.fn(),
    registerAiIndexResolver: jest.fn(),
  } as any;
  const uiSettings = { registerGlobal } as any;
  const coreSetup = { getStartServices: jest.fn() } as any;
  return { coreSetup, uiSettings, agents, registerGlobal, register };
};

describe('registerDeductiveAgent', () => {
  it('registers nothing when the deployment has not opted in', () => {
    const { coreSetup, uiSettings, agents, registerGlobal, register } = setup();

    registerDeductiveAgent({ coreSetup, uiSettings, agents, register: false });

    expect(registerGlobal).not.toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
  });

  it('registers the agent and its global settings when opted in', () => {
    const { coreSetup, uiSettings, agents, registerGlobal, register } = setup();

    registerDeductiveAgent({ coreSetup, uiSettings, agents, register: true });

    expect(registerGlobal).toHaveBeenCalledWith(
      expect.objectContaining({
        'agentBuilder:deductiveEnabled': expect.any(Object),
        'agentBuilder:deductiveEndpoint': expect.any(Object),
        'agentBuilder:deductiveApiKey': expect.any(Object),
      })
    );
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ id: 'deductive.ai' }));
  });
});
