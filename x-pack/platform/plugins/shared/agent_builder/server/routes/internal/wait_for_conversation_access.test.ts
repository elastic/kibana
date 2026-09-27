/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExecutionStatus,
  createConversationNotFoundError,
  isConversationNotFoundError,
} from '@kbn/agent-builder-common';
import { waitForConversationAccess } from './wait_for_conversation_access';

const setup = ({
  exists,
  statuses = [ExecutionStatus.running],
}: {
  exists: boolean[];
  statuses?: ExecutionStatus[];
}) => {
  const existsMock = jest.fn();
  exists.forEach((value) => existsMock.mockResolvedValueOnce(value));
  const getConversation = jest.fn().mockResolvedValue({ id: 'conv-1' });
  const getExecution = jest.fn();
  statuses.forEach((status) => getExecution.mockResolvedValueOnce({ status }));
  getExecution.mockResolvedValue({ status: statuses[statuses.length - 1] });

  const wait = ({
    signal = new AbortController().signal,
    timeoutMs = 60_000,
  }: { signal?: AbortSignal; timeoutMs?: number } = {}) =>
    waitForConversationAccess({
      conversationClient: { exists: existsMock, get: getConversation },
      conversationId: 'conv-1',
      executionService: { getExecution },
      executionId: 'exec-1',
      signal,
      timeoutMs,
      pollIntervalMs: 0,
    });

  return { wait, getConversation, getExecution };
};

describe('waitForConversationAccess', () => {
  it('checks access right away when the conversation exists', async () => {
    const { wait, getConversation, getExecution } = setup({ exists: [true] });

    await wait();

    expect(getConversation).toHaveBeenCalledWith('conv-1');
    expect(getExecution).not.toHaveBeenCalled();
  });

  it('waits for a pending execution to create the conversation before checking access', async () => {
    const { wait, getConversation, getExecution } = setup({
      exists: [false, false, true],
      statuses: [ExecutionStatus.scheduled, ExecutionStatus.running],
    });

    await wait();

    expect(getExecution).toHaveBeenCalledTimes(2);
    expect(getConversation).toHaveBeenCalledWith('conv-1');
  });

  it('checks access when the conversation was created right before the execution ended', async () => {
    const { wait, getConversation } = setup({
      exists: [false, true],
      statuses: [ExecutionStatus.completed],
    });

    await wait();

    expect(getConversation).toHaveBeenCalledWith('conv-1');
  });

  it('fails when the execution is no longer pending and never created the conversation', async () => {
    const { wait, getConversation } = setup({
      exists: [false, false],
      statuses: [ExecutionStatus.failed],
    });

    const error = await wait().catch((caught: Error) => caught);

    expect(isConversationNotFoundError(error)).toBe(true);
    expect(getConversation).not.toHaveBeenCalled();
  });

  it('fails when the conversation is not created in time', async () => {
    const { wait, getConversation } = setup({ exists: [false] });

    const error = await wait({ timeoutMs: 0 }).catch((caught: Error) => caught);

    expect(isConversationNotFoundError(error)).toBe(true);
    expect(getConversation).not.toHaveBeenCalled();
  });

  it('stops waiting once aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const { wait, getConversation } = setup({ exists: [false] });

    const error = await wait({ signal: controller.signal }).catch((caught: Error) => caught);

    expect(isConversationNotFoundError(error)).toBe(true);
    expect(getConversation).not.toHaveBeenCalled();
  });

  it('fails when the user may not converse in the conversation', async () => {
    const accessError = createConversationNotFoundError({ conversationId: 'conv-1' });
    const { wait, getConversation } = setup({ exists: [true] });
    getConversation.mockRejectedValue(accessError);

    await expect(wait()).rejects.toBe(accessError);
  });
});
