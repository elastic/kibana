/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { AgentBuilderErrorCode, TimelineEventType } from '@kbn/agent-builder-common';
import { useSendSteer } from './use_send_steer';

jest.mock('./use_agent_builder_service');
jest.mock('../context/conversation/use_conversation_id');
jest.mock('../context/streaming/streaming_context', () => ({
  useConversationStreamService: jest.fn(),
}));
jest.mock('./use_conversation_stream', () => ({
  useConversationStream: jest.fn(),
}));
jest.mock('./use_toasts', () => ({
  useToasts: jest.fn(),
}));
jest.mock('@kbn/agent-builder-browser', () => ({
  formatAgentBuilderErrorMessage: (error: Error) => error.message,
}));

const { useAgentBuilderServices } = jest.requireMock('./use_agent_builder_service');
const { useConversationId } = jest.requireMock('../context/conversation/use_conversation_id');
const { useConversationStreamService } = jest.requireMock('../context/streaming/streaming_context');
const { useConversationStream } = jest.requireMock('./use_conversation_stream');
const { useToasts } = jest.requireMock('./use_toasts');

const conversationId = 'conv-1';

const httpError = ({
  status,
  message = 'Refused',
  attributes,
}: {
  status: number;
  message?: string;
  attributes?: Record<string, unknown>;
}) =>
  Object.assign(new Error(message), {
    name: 'HttpFetchError',
    request: {},
    response: { status },
    body: { statusCode: status, message, ...(attributes ? { attributes } : {}) },
  });

const steerRefusal = (code: AgentBuilderErrorCode, status = 409) =>
  httpError({ status, attributes: { code } });

const networkError = () => new Error('Failed to fetch');

const busyRejection = () =>
  httpError({
    status: 409,
    message: 'Conversation busy',
    attributes: { code: AgentBuilderErrorCode.conversationBusy },
  });

const storedEvent = (eventId: string, message = 'hello') => ({
  id: eventId,
  type: TimelineEventType.userMessage,
  created_at: '2026-11-12T10:00:00.000Z',
  actor: { type: 'user', id: 'user-1', username: 'sid' },
  data: { message, steer: { execution_id: 'exec-1' } },
});
const storedResponse = (eventId: string, message?: string) => ({
  event: storedEvent(eventId, message),
});

describe('useSendSteer', () => {
  let steer: jest.Mock;
  let recordSteer: jest.Mock;
  let sendMessage: jest.Mock;
  let addErrorToast: jest.Mock;

  const steerIdOfCall = (call: number): string => steer.mock.calls[call][0].eventId;

  beforeEach(() => {
    steer = jest.fn();
    recordSteer = jest.fn();
    sendMessage = jest.fn();
    addErrorToast = jest.fn();
    useAgentBuilderServices.mockReturnValue({ conversationsService: { steer } });
    useConversationId.mockReturnValue(conversationId);
    useConversationStreamService.mockReturnValue({ recordSteer });
    useConversationStream.mockReturnValue({ sendMessage });
    useToasts.mockReturnValue({ addErrorToast });
  });

  it('stores the message and shows it waiting in the live stream', async () => {
    steer.mockImplementation(({ eventId, message }) =>
      Promise.resolve(storedResponse(eventId, message))
    );
    const { result } = renderHook(() => useSendSteer());

    let sent: boolean | undefined;
    await act(async () => {
      sent = await result.current.sendSteer('use a table');
    });

    expect(sent).toBe(true);
    expect(steer).toHaveBeenCalledWith({
      conversationId,
      message: 'use a table',
      eventId: expect.any(String),
    });
    // The event goes into the live stream as the server returned it.
    expect(recordSteer).toHaveBeenCalledWith(
      conversationId,
      storedEvent(steerIdOfCall(0), 'use a table')
    );
    expect(sendMessage).not.toHaveBeenCalled();
    expect(addErrorToast).not.toHaveBeenCalled();
  });

  it('does nothing without a conversation', async () => {
    useConversationId.mockReturnValue(undefined);
    const { result } = renderHook(() => useSendSteer());

    let sent: boolean | undefined;
    await act(async () => {
      sent = await result.current.sendSteer('hello');
    });

    expect(sent).toBe(false);
    expect(steer).not.toHaveBeenCalled();
  });

  it('starts a run through the ordinary send when no run holds the conversation', async () => {
    steer.mockRejectedValue(steerRefusal(AgentBuilderErrorCode.noActiveExecution));
    const { result } = renderHook(() => useSendSteer());

    let sent: boolean | undefined;
    await act(async () => {
      sent = await result.current.sendSteer('hello');
    });

    expect(sent).toBe(true);
    expect(sendMessage).toHaveBeenCalledWith({
      message: 'hello',
      conversationId,
      onRejected: expect.any(Function),
    });
    expect(addErrorToast).not.toHaveBeenCalled();
  });

  it('sends nothing more when an earlier request already stored the message', async () => {
    steer.mockImplementation(({ eventId }) =>
      Promise.resolve({ ...storedResponse(eventId), already_stored: true })
    );
    const { result } = renderHook(() => useSendSteer());

    let sent: boolean | undefined;
    await act(async () => {
      sent = await result.current.sendSteer('hello');
    });

    expect(sent).toBe(true);
    expect(recordSteer).toHaveBeenCalledTimes(1);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(addErrorToast).not.toHaveBeenCalled();
  });

  it.each([
    [AgentBuilderErrorCode.conversationAwaitingPrompt, /waiting for your answer/],
    [AgentBuilderErrorCode.conversationNotSteerable, /public conversation/],
    [AgentBuilderErrorCode.tooManyPendingSteers, /unread messages/],
  ] as const)('keeps the text and explains a %s refusal', async (code, title) => {
    steer.mockRejectedValue(steerRefusal(code));
    const { result } = renderHook(() => useSendSteer());

    let sent: boolean | undefined;
    await act(async () => {
      sent = await result.current.sendSteer('hello');
    });

    expect(sent).toBe(false);
    expect(addErrorToast).toHaveBeenCalledWith({ title: expect.stringMatching(title) });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('shows the server message for a refusal without a steer code and does not keep its id', async () => {
    steer.mockRejectedValueOnce(httpError({ status: 404, message: 'Conversation not found' }));
    steer.mockImplementationOnce(({ eventId }) => Promise.resolve(storedResponse(eventId)));
    const { result } = renderHook(() => useSendSteer());

    await act(async () => {
      await result.current.sendSteer('hello');
    });
    expect(addErrorToast).toHaveBeenCalledWith({ title: 'Conversation not found' });

    await act(async () => {
      await result.current.sendSteer('hello');
    });

    expect(steer).toHaveBeenCalledTimes(2);
    expect(steerIdOfCall(1)).not.toBe(steerIdOfCall(0));
  });

  describe('a request that got no answer', () => {
    it('reports the failure, keeps the text, and retries the same text under the same id', async () => {
      steer.mockRejectedValueOnce(networkError());
      steer.mockImplementationOnce(({ eventId }) => Promise.resolve(storedResponse(eventId)));
      const { result } = renderHook(() => useSendSteer());

      let sent: boolean | undefined;
      await act(async () => {
        sent = await result.current.sendSteer('hello');
      });
      expect(sent).toBe(false);
      expect(addErrorToast).toHaveBeenCalledWith({
        title: expect.stringMatching(/could not be sent/),
      });

      await act(async () => {
        sent = await result.current.sendSteer('hello');
      });

      expect(sent).toBe(true);
      expect(steer).toHaveBeenCalledTimes(2);
      expect(steerIdOfCall(1)).toBe(steerIdOfCall(0));
    });

    it('treats the message as stored when the retry finds it there', async () => {
      steer.mockRejectedValueOnce(networkError());
      steer.mockImplementationOnce(({ eventId }) =>
        Promise.resolve({ ...storedResponse(eventId), already_stored: true })
      );
      const { result } = renderHook(() => useSendSteer());

      await act(async () => {
        await result.current.sendSteer('hello');
      });
      let sent: boolean | undefined;
      await act(async () => {
        sent = await result.current.sendSteer('hello');
      });

      expect(sent).toBe(true);
      expect(steerIdOfCall(1)).toBe(steerIdOfCall(0));
      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('uses a new id for different text', async () => {
      steer.mockRejectedValueOnce(networkError());
      steer.mockImplementationOnce(({ eventId }) => Promise.resolve(storedResponse(eventId)));
      const { result } = renderHook(() => useSendSteer());

      await act(async () => {
        await result.current.sendSteer('hello');
      });
      await act(async () => {
        await result.current.sendSteer('hello again');
      });

      expect(steerIdOfCall(1)).not.toBe(steerIdOfCall(0));
    });

    it('forgets the id once a request was answered', async () => {
      steer.mockRejectedValueOnce(networkError());
      steer.mockRejectedValueOnce(steerRefusal(AgentBuilderErrorCode.tooManyPendingSteers, 429));
      steer.mockImplementationOnce(({ eventId }) => Promise.resolve(storedResponse(eventId)));
      const { result } = renderHook(() => useSendSteer());

      for (let attempt = 0; attempt < 3; attempt++) {
        await act(async () => {
          await result.current.sendSteer('hello');
        });
      }

      expect(steerIdOfCall(1)).toBe(steerIdOfCall(0));
      expect(steerIdOfCall(2)).not.toBe(steerIdOfCall(0));
    });

    it('recognises the same text as its retry until a request was answered', async () => {
      steer.mockRejectedValueOnce(networkError());
      steer.mockImplementationOnce(({ eventId }) => Promise.resolve(storedResponse(eventId)));
      const { result } = renderHook(() => useSendSteer());

      expect(result.current.isUnansweredSteer('hello')).toBe(false);
      await act(async () => {
        await result.current.sendSteer('hello');
      });
      expect(result.current.isUnansweredSteer('hello')).toBe(true);
      expect(result.current.isUnansweredSteer('hello again')).toBe(false);

      await act(async () => {
        await result.current.sendSteer('hello');
      });
      expect(result.current.isUnansweredSteer('hello')).toBe(false);
    });

    it('retries through the steer path once the run has ended and starts the next run when nothing was stored', async () => {
      steer.mockRejectedValueOnce(networkError());
      steer.mockRejectedValueOnce(steerRefusal(AgentBuilderErrorCode.noActiveExecution));
      const { result } = renderHook(() => useSendSteer());

      await act(async () => {
        await result.current.sendSteer('hello');
      });
      let sent: boolean | undefined;
      await act(async () => {
        sent = await result.current.sendSteer('hello');
      });

      expect(sent).toBe(true);
      expect(steerIdOfCall(1)).toBe(steerIdOfCall(0));
      expect(sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'hello', conversationId })
      );
      expect(recordSteer).not.toHaveBeenCalled();
    });
  });

  describe('when the ordinary send is refused because a run took the conversation', () => {
    const fallBackToConverse = async () => {
      steer.mockRejectedValueOnce(steerRefusal(AgentBuilderErrorCode.noActiveExecution));
      const onUnsent = jest.fn();
      const { result } = renderHook(() => useSendSteer());
      await act(async () => {
        await result.current.sendSteer('hello', { onUnsent });
      });
      const { onRejected } = sendMessage.mock.calls[0][0];
      return { onRejected, onUnsent, result };
    };

    it('steers the new run once, under the same id, and handles the rejection', async () => {
      const { onRejected, onUnsent } = await fallBackToConverse();
      steer.mockImplementationOnce(({ eventId }) => Promise.resolve(storedResponse(eventId)));

      let handled: boolean | undefined;
      act(() => {
        handled = onRejected(busyRejection());
      });

      expect(handled).toBe(true);
      await waitFor(() => expect(recordSteer).toHaveBeenCalledTimes(1));
      expect(steer).toHaveBeenCalledTimes(2);
      expect(steerIdOfCall(1)).toBe(steerIdOfCall(0));
      expect(addErrorToast).not.toHaveBeenCalled();
      expect(onUnsent).not.toHaveBeenCalled();
    });

    it('gives the text back with the reason when the second steer is refused too', async () => {
      const { onRejected, onUnsent } = await fallBackToConverse();
      steer.mockRejectedValueOnce(steerRefusal(AgentBuilderErrorCode.tooManyPendingSteers, 429));

      act(() => {
        onRejected(busyRejection());
      });

      await waitFor(() =>
        expect(addErrorToast).toHaveBeenCalledWith({
          title: expect.stringMatching(/unread messages/),
        })
      );
      expect(onUnsent).toHaveBeenCalledWith('hello');
      expect(steer).toHaveBeenCalledTimes(2);
    });

    it('gives the text back when the new run is gone again rather than racing a third time', async () => {
      const { onRejected, onUnsent } = await fallBackToConverse();
      steer.mockRejectedValueOnce(steerRefusal(AgentBuilderErrorCode.noActiveExecution));

      act(() => {
        onRejected(busyRejection());
      });

      await waitFor(() =>
        expect(addErrorToast).toHaveBeenCalledWith({
          title: expect.stringMatching(/could not be sent/),
        })
      );
      expect(onUnsent).toHaveBeenCalledWith('hello');
      expect(sendMessage).toHaveBeenCalledTimes(1);
    });

    it('leaves any other rejection to the send path', async () => {
      const { onRejected, onUnsent } = await fallBackToConverse();

      let handled: boolean | undefined;
      act(() => {
        handled = onRejected(httpError({ status: 403, message: 'Forbidden' }));
      });

      expect(handled).toBe(false);
      expect(steer).toHaveBeenCalledTimes(1);
      expect(addErrorToast).not.toHaveBeenCalled();
      expect(onUnsent).not.toHaveBeenCalled();
    });

    it('keeps the id when the steer of the new run gets no answer, so the resend retries it', async () => {
      const { onRejected, onUnsent, result } = await fallBackToConverse();
      steer.mockRejectedValueOnce(networkError());
      steer.mockImplementationOnce(({ eventId }) => Promise.resolve(storedResponse(eventId)));

      act(() => {
        onRejected(busyRejection());
      });
      await waitFor(() => expect(onUnsent).toHaveBeenCalledWith('hello'));

      expect(result.current.isUnansweredSteer('hello')).toBe(true);
      await act(async () => {
        await result.current.sendSteer('hello');
      });
      expect(steer).toHaveBeenCalledTimes(3);
      expect(steerIdOfCall(2)).toBe(steerIdOfCall(0));
    });
  });

  describe('steering the run that refused an ordinary send', () => {
    const steerIfBusyHandler = () => {
      const onUnsent = jest.fn();
      const { result } = renderHook(() => useSendSteer());
      const onRejected = result.current.steerIfBusy('hello', { onUnsent });
      return { onRejected, onUnsent, result };
    };

    it('steers the run under a new id and shows the message waiting', async () => {
      steer.mockImplementationOnce(({ eventId }) => Promise.resolve(storedResponse(eventId)));
      const { onRejected, onUnsent } = steerIfBusyHandler();

      let handled: boolean | undefined;
      act(() => {
        handled = onRejected(busyRejection());
      });

      expect(handled).toBe(true);
      await waitFor(() => expect(recordSteer).toHaveBeenCalledTimes(1));
      expect(steer).toHaveBeenCalledWith({
        conversationId,
        message: 'hello',
        eventId: expect.any(String),
      });
      expect(addErrorToast).not.toHaveBeenCalled();
      expect(onUnsent).not.toHaveBeenCalled();
    });

    it('gives the text back with the reason when the run refuses the steer', async () => {
      steer.mockRejectedValueOnce(steerRefusal(AgentBuilderErrorCode.conversationAwaitingPrompt));
      const { onRejected, onUnsent } = steerIfBusyHandler();

      act(() => {
        onRejected(busyRejection());
      });

      await waitFor(() =>
        expect(addErrorToast).toHaveBeenCalledWith({
          title: expect.stringMatching(/waiting for your answer/),
        })
      );
      expect(onUnsent).toHaveBeenCalledWith('hello');
    });

    it('keeps the id when the steer gets no answer, so the resend retries it', async () => {
      steer.mockRejectedValueOnce(networkError());
      steer.mockImplementationOnce(({ eventId }) => Promise.resolve(storedResponse(eventId)));
      const { onRejected, onUnsent, result } = steerIfBusyHandler();

      act(() => {
        onRejected(busyRejection());
      });
      await waitFor(() => expect(onUnsent).toHaveBeenCalledWith('hello'));

      expect(result.current.isUnansweredSteer('hello')).toBe(true);
      await act(async () => {
        await result.current.sendSteer('hello');
      });
      expect(steer).toHaveBeenCalledTimes(2);
      expect(steerIdOfCall(1)).toBe(steerIdOfCall(0));
    });

    it('leaves any other rejection to the send path', () => {
      const { onRejected } = steerIfBusyHandler();

      expect(onRejected(httpError({ status: 403, message: 'Forbidden' }))).toBe(false);
      expect(steer).not.toHaveBeenCalled();
    });

    it('does nothing without a conversation', () => {
      useConversationId.mockReturnValue(undefined);
      const { onRejected } = steerIfBusyHandler();

      expect(onRejected(busyRejection())).toBe(false);
      expect(steer).not.toHaveBeenCalled();
    });
  });
});
