/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { act, renderHook } from '@testing-library/react';
import { ConversationStreamService } from '../../../services/events/conversation_stream_service';
import { useSendMessageMutation } from './use_send_message_mutation';
import { useResumeRoundMutation } from './use_resume_round_mutation';
import { useAttachExecutionMutation } from './use_attach_execution_mutation';
import { StreamingProvider, useStreamingContext } from './streaming_context';

jest.mock('./use_send_message_mutation', () => ({ useSendMessageMutation: jest.fn() }));
jest.mock('./use_resume_round_mutation', () => ({ useResumeRoundMutation: jest.fn() }));
jest.mock('./use_attach_execution_mutation', () => ({ useAttachExecutionMutation: jest.fn() }));

const fakeMutation = () => ({
  mutate: jest.fn(),
  cancel: jest.fn<string | undefined, [string]>(),
  detachAll: jest.fn(),
  isLoading: false,
});

const setup = () => {
  const send = fakeMutation();
  const resume = fakeMutation();
  const attach = fakeMutation();
  jest.mocked(useSendMessageMutation).mockReturnValue(send);
  jest.mocked(useResumeRoundMutation).mockReturnValue(resume);
  jest.mocked(useAttachExecutionMutation).mockReturnValue(attach);

  const Wrapper = ({ children }: PropsWithChildren) => (
    <StreamingProvider conversationStreamService={new ConversationStreamService()}>
      {children}
    </StreamingProvider>
  );
  const hook = renderHook(() => useStreamingContext(), { wrapper: Wrapper });
  return { send, resume, attach, ...hook };
};

describe('StreamingProvider', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mutateAttach registers an attach stream for the conversation before the mutation runs', () => {
    const { attach, result } = setup();

    act(() => result.current.mutateAttach({ conversationId: 'conv-1', executionId: 'exec-1' }));

    expect(result.current.activeStreams.get('conv-1')).toEqual({ type: 'attach' });
    expect(attach.mutate).toHaveBeenCalledWith({ conversationId: 'conv-1', executionId: 'exec-1' });
  });

  it('cancelStream asks every mutation to stop and remembers the stopped execution', () => {
    const { send, resume, attach, result } = setup();
    attach.cancel.mockReturnValue('exec-1');

    act(() => result.current.mutateAttach({ conversationId: 'conv-1', executionId: 'exec-1' }));
    act(() => result.current.cancelStream('conv-1'));

    expect(send.cancel).toHaveBeenCalledWith('conv-1');
    expect(resume.cancel).toHaveBeenCalledWith('conv-1');
    expect(attach.cancel).toHaveBeenCalledWith('conv-1');
    expect(result.current.activeStreams.get('conv-1')).toEqual({
      type: 'attach',
      cancelling: true,
    });
  });

  it('attaches to an execution once per mount, however often the pointer is seen', () => {
    const { attach, result } = setup();

    act(() => result.current.mutateAttach({ conversationId: 'conv-1', executionId: 'exec-1' }));
    act(() => result.current.mutateAttach({ conversationId: 'conv-1', executionId: 'exec-1' }));

    expect(attach.mutate).toHaveBeenCalledTimes(1);
  });

  it('does not re-attach to an execution stopped from here while its pointer lingers', () => {
    const { send, attach, result } = setup();
    send.cancel.mockReturnValue('exec-1');

    act(() => result.current.mutateSendMessage({ conversationId: 'conv-1' } as never));
    act(() => result.current.cancelStream('conv-1'));
    act(() => result.current.mutateAttach({ conversationId: 'conv-1', executionId: 'exec-1' }));

    expect(attach.mutate).not.toHaveBeenCalled();
    expect(result.current.activeStreams.get('conv-1')).toEqual({ type: 'send', cancelling: true });
  });

  it('closes every connection locally when the provider unmounts', () => {
    const { send, resume, attach, unmount } = setup();

    unmount();

    expect(send.detachAll).toHaveBeenCalledTimes(1);
    expect(resume.detachAll).toHaveBeenCalledTimes(1);
    expect(attach.detachAll).toHaveBeenCalledTimes(1);
    // No server abort: the runs keep going and are re-attached on return.
    expect(send.cancel).not.toHaveBeenCalled();
    expect(resume.cancel).not.toHaveBeenCalled();
    expect(attach.cancel).not.toHaveBeenCalled();
  });
});
