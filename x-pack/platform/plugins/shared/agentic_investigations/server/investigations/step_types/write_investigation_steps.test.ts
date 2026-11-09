/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { InvestigationsClient } from '../services/investigations_client';
import {
  getCreateInvestigationStepDefinition,
  getPatchInvestigationStepDefinition,
} from './write_investigation_steps';

const FAKE_REQUEST = { fake: true } as never;

const createContext = (input: Record<string, unknown>): StepHandlerContext<never, never> =>
  ({
    input,
    rawInput: input,
    config: {},
    contextManager: {
      getContext: jest.fn().mockReturnValue({
        execution: { id: 'exec-1' },
        workflow: { id: 'wf-1', name: 'Alert Triage', spaceId: 'default' },
      }),
      getFakeRequest: jest.fn().mockReturnValue(FAKE_REQUEST),
    },
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    abortSignal: new AbortController().signal,
  } as unknown as StepHandlerContext<never, never>);

const WORKER = { type: 'workflow', id: 'wf-1', name: 'Alert Triage', run_id: 'exec-1' };

describe('investigation write steps', () => {
  it('investigations.create writes through the client as the workflow, with the Worker as actor', async () => {
    const client = {
      create: jest.fn().mockResolvedValue({
        conversation_id: 'conv-1',
        agent_id: 'agent-1',
        template_id: 'investigation',
        metadata: { status: 'open' },
        case_id: 'case-1',
      }),
    };
    const getInvestigationsClient = jest
      .fn()
      .mockReturnValue(client as unknown as InvestigationsClient);
    const step = getCreateInvestigationStepDefinition({ getInvestigationsClient });
    const input = {
      template_id: 'investigation',
      title: 'Alert Triage',
      metadata: { status: 'open' },
    };

    const result = await step.handler(createContext(input));

    expect(getInvestigationsClient).toHaveBeenCalledWith(FAKE_REQUEST);
    expect(client.create).toHaveBeenCalledWith(input, { source: 'workflow', actionSource: WORKER });
    expect(result).toEqual({
      output: expect.objectContaining({ conversation_id: 'conv-1', case_id: 'case-1' }),
    });
  });

  it('investigations.patch returns errors as the step error, as ai.conversation.metadata.patch does', async () => {
    const error = new Error('Unknown field');
    const client = { patchMetadata: jest.fn().mockRejectedValue(error) };
    const step = getPatchInvestigationStepDefinition({
      getInvestigationsClient: () => client as unknown as InvestigationsClient,
    });

    const result = await step.handler(
      createContext({ conversation_id: 'conv-1', updates: { status: 'closed' } })
    );

    expect(client.patchMetadata).toHaveBeenCalledWith(
      { conversation_id: 'conv-1', updates: { status: 'closed' } },
      { source: 'workflow', actionSource: WORKER }
    );
    expect(result).toEqual({ error });
  });
});
