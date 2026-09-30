/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { InvestigationStatusService } from '../services/investigation_status_service';
import { WrongTemplateError } from '../../assignments/errors';
import { getReopenInvestigationStepDefinition } from './reopen_investigation_step';

const FAKE_REQUEST = { fake: true } as never;

const createContext = (input: Record<string, unknown>): StepHandlerContext<never, never> =>
  ({
    input,
    rawInput: input,
    config: {},
    contextManager: {
      getContext: jest.fn().mockReturnValue({
        execution: { id: 'exec-1', executedBy: 'worker-user' },
        workflow: { spaceId: 'default' },
      }),
      getScopedEsClient: jest.fn(),
      getFakeRequest: jest.fn().mockReturnValue(FAKE_REQUEST),
      renderInputTemplate: jest.fn((value) => value),
      callKibanaApi: jest.fn(),
    },
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    abortSignal: new AbortController().signal,
    stepId: 'reopen_investigation',
    stepType: 'investigations.reopen',
  } as unknown as StepHandlerContext<never, never>);

const makeConversation = (status: string, title: string, rename = true) => ({
  id: 'conv-1',
  title,
  template_id: 'investigation',
  metadata: { status },
  permissions: { rename, delete: rename, update_access_control: rename },
});

describe('investigations.reopen step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeDefinition = (
    conversationData: { status: string; title: string; rename?: boolean },
    setStatusMock = jest.fn().mockResolvedValue({ status: 'open' }),
    updateMock = jest.fn().mockResolvedValue({})
  ) => {
    const conv = makeConversation(
      conversationData.status,
      conversationData.title,
      conversationData.rename
    );
    const getConversationClient = jest.fn().mockResolvedValue({
      get: jest.fn().mockResolvedValue(conv),
      update: updateMock,
    });
    const getInvestigationStatusService = jest.fn().mockReturnValue({
      setStatus: setStatusMock,
    } as unknown as InvestigationStatusService);

    return {
      definition: getReopenInvestigationStepDefinition({
        getInvestigationStatusService,
        getConversationClient: getConversationClient as never,
      }),
      setStatusMock,
      updateMock,
    };
  };

  it('should return reopened: false when the investigation is already open', async () => {
    const { definition, setStatusMock, updateMock } = makeDefinition({
      status: 'open',
      title: 'My Investigation',
    });

    const result = await definition.handler(createContext({ conversationId: 'conv-1' }));

    expect(result.output).toEqual({ reopened: false, title: 'My Investigation' });
    expect(setStatusMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('should reopen and prepend [Reopen] when the investigation is closed', async () => {
    const { definition, setStatusMock, updateMock } = makeDefinition({
      status: 'closed',
      title: 'My Investigation',
    });

    const result = await definition.handler(createContext({ conversationId: 'conv-1' }));

    expect(setStatusMock).toHaveBeenCalledWith(FAKE_REQUEST, 'conv-1', { status: 'open' });
    expect(updateMock).toHaveBeenCalledWith({ id: 'conv-1', title: '[Reopen] My Investigation' });
    expect(result.output).toEqual({ reopened: true, title: '[Reopen] My Investigation' });
  });

  it('should rename before reopening so the investigation stays closed until the last write', async () => {
    const { definition, setStatusMock, updateMock } = makeDefinition({
      status: 'closed',
      title: 'My Investigation',
    });

    await definition.handler(createContext({ conversationId: 'conv-1' }));

    expect(updateMock.mock.invocationCallOrder[0]).toBeLessThan(
      setStatusMock.mock.invocationCallOrder[0]
    );
  });

  it('should skip the rename when [Reopen] is already present', async () => {
    const { definition, setStatusMock, updateMock } = makeDefinition({
      status: 'closed',
      title: '[Reopen] My Investigation',
    });

    const result = await definition.handler(createContext({ conversationId: 'conv-1' }));

    expect(updateMock).not.toHaveBeenCalled();
    expect(setStatusMock).toHaveBeenCalledWith(FAKE_REQUEST, 'conv-1', { status: 'open' });
    expect(result.output).toEqual({ reopened: true, title: '[Reopen] My Investigation' });
  });

  it('should fail with PermissionError without writing anything when the caller cannot rename', async () => {
    const { definition, setStatusMock, updateMock } = makeDefinition({
      status: 'closed',
      title: 'My Investigation',
      rename: false,
    });

    await expect(
      definition.handler(createContext({ conversationId: 'conv-1' }))
    ).rejects.toMatchObject({ type: 'PermissionError' });
    expect(updateMock).not.toHaveBeenCalled();
    expect(setStatusMock).not.toHaveBeenCalled();
  });

  it('should leave the investigation closed when the rename fails', async () => {
    const { definition, setStatusMock } = makeDefinition(
      { status: 'closed', title: 'My Investigation' },
      undefined,
      jest.fn().mockRejectedValue(new Error('ES unavailable'))
    );

    await expect(
      definition.handler(createContext({ conversationId: 'conv-1' }))
    ).rejects.toMatchObject({ type: 'ApiError', message: 'ES unavailable' });
    expect(setStatusMock).not.toHaveBeenCalled();
  });

  // The retry after a rename that landed and a status write that did not: the
  // investigation is still closed, so it must still report `reopened: true`.
  it('should still report reopened on a retry after the status write failed', async () => {
    const setStatusMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('ES unavailable'))
      .mockResolvedValueOnce({ status: 'open' });
    const first = makeDefinition({ status: 'closed', title: 'My Investigation' }, setStatusMock);
    await expect(
      first.definition.handler(createContext({ conversationId: 'conv-1' }))
    ).rejects.toMatchObject({ type: 'ApiError' });

    const retry = makeDefinition(
      { status: 'closed', title: '[Reopen] My Investigation' },
      setStatusMock
    );
    const result = await retry.definition.handler(createContext({ conversationId: 'conv-1' }));

    expect(result.output).toEqual({ reopened: true, title: '[Reopen] My Investigation' });
  });

  it('should fail the step with ValidationError when the conversation is not an investigation', async () => {
    const getConversationClient = jest.fn().mockResolvedValue({
      get: jest.fn().mockResolvedValue(makeConversation('closed', 'Not an investigation')),
      update: jest.fn(),
    });
    const setStatusMock = jest
      .fn()
      .mockRejectedValue(new WrongTemplateError('conv-1', 'investigation'));
    const definition = getReopenInvestigationStepDefinition({
      getInvestigationStatusService: jest.fn().mockReturnValue({
        setStatus: setStatusMock,
      } as unknown as InvestigationStatusService),
      getConversationClient: getConversationClient as never,
    });

    await expect(
      definition.handler(createContext({ conversationId: 'conv-1' }))
    ).rejects.toMatchObject({ type: 'ValidationError' });
  });

  it('should reject a malformed input as a ValidationError before touching any service', async () => {
    const setStatusMock = jest.fn();
    const getConversationClient = jest
      .fn()
      .mockResolvedValue({ get: jest.fn(), update: jest.fn() });
    const definition = getReopenInvestigationStepDefinition({
      getInvestigationStatusService: jest.fn().mockReturnValue({ setStatus: setStatusMock }),
      getConversationClient: getConversationClient as never,
    });

    await expect(definition.handler(createContext({}))).rejects.toMatchObject({
      type: 'ValidationError',
    });
    expect(setStatusMock).not.toHaveBeenCalled();
    expect(getConversationClient).not.toHaveBeenCalled();
  });
});
