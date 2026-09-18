/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runAgent } from './run_agent';

jest.mock('./run_chat_agent', () => ({
  runDefaultAgentMode: jest.fn().mockResolvedValue({ round: { id: 'native-round' } }),
}));

jest.mock('./deductive', () => ({
  shouldUseDeductive: jest.fn().mockReturnValue(true),
  runDeductiveAgent: jest.fn().mockResolvedValue({ round: { id: 'deductive-round' } }),
}));

import * as chatAgent from './run_chat_agent';
import * as deductive from './deductive';

const chatAgentMock = chatAgent as jest.Mocked<typeof chatAgent>;
const deductiveMock = deductive as jest.Mocked<typeof deductive>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('runAgent routing', () => {
  it('delegates to the default (native) path when the agent is not routed to Deductive', async () => {
    deductiveMock.shouldUseDeductive.mockReturnValueOnce(false);

    const result = await runAgent({ agentId: 'plain-agent' } as never, {} as never);

    expect(deductiveMock.runDeductiveAgent).not.toHaveBeenCalled();
    expect(chatAgentMock.runDefaultAgentMode).toHaveBeenCalledTimes(1);
    expect(result.round.id).toBe('native-round');
  });

  it('routes to Deductive when the agent id matches', async () => {
    const result = await runAgent({ agentId: 'deductive.ai' } as never, {} as never);

    expect(deductiveMock.runDeductiveAgent).toHaveBeenCalledTimes(1);
    expect(chatAgentMock.runDefaultAgentMode).not.toHaveBeenCalled();
    expect(result.round.id).toBe('deductive-round');
  });
});
