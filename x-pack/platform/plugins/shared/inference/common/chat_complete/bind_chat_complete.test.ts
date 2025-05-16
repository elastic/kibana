/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BoundChatCompleteOptions,
  ChatCompleteAPI,
  MessageRole,
  UnboundChatCompleteOptions,
} from '@kbn/inference-common';
import { bindChatComplete } from './bind_chat_complete';

describe('bindChatComplete', () => {
  let chatComplete: ChatCompleteAPI & jest.MockedFn<ChatCompleteAPI>;

  beforeEach(() => {
    chatComplete = jest.fn();
  });

  it('calls chatComplete with both bound and unbound params', async () => {
    const bound: BoundChatCompleteOptions = {
      connectorId: 'some-id',
      functionCalling: 'native',
    };

    const unbound: UnboundChatCompleteOptions = {
      messages: [{ role: MessageRole.User, content: 'hello there' }],
    };

    const boundApi = bindChatComplete(chatComplete, bound);

    await boundApi({ ...unbound });

    expect(chatComplete).toHaveBeenCalledTimes(1);
    expect(chatComplete).toHaveBeenCalledWith({
      ...bound,
      ...unbound,
    });
  });

  it('forwards the response from chatComplete', async () => {
    const expectedReturnValue = Symbol('something');
    chatComplete.mockResolvedValue(expectedReturnValue as any);

    const boundApi = bindChatComplete(chatComplete, { connectorId: 'my-connector' });

    const result = await boundApi({
      messages: [{ role: MessageRole.User, content: 'hello there' }],
    });

    expect(result).toEqual(expectedReturnValue);
  });

  it('only passes the expected parameters from the bound param object', async () => {
    const bound = {
      connectorId: 'some-id',
      functionCalling: 'native',
      foo: 'bar',
    } as BoundChatCompleteOptions;

    const unbound: UnboundChatCompleteOptions = {
      messages: [{ role: MessageRole.User, content: 'hello there' }],
    };

    const boundApi = bindChatComplete(chatComplete, bound);

    await boundApi({ ...unbound });

    expect(chatComplete).toHaveBeenCalledTimes(1);
    expect(chatComplete).toHaveBeenCalledWith({
      connectorId: 'some-id',
      functionCalling: 'native',
      messages: unbound.messages,
    });
  });

  it('ignores mutations of the bound parameters after binding', async () => {
    const bound: BoundChatCompleteOptions = {
      connectorId: 'some-id',
      functionCalling: 'native',
    };

    const unbound: UnboundChatCompleteOptions = {
      messages: [{ role: MessageRole.User, content: 'hello there' }],
    };

    const boundApi = bindChatComplete(chatComplete, bound);

    bound.connectorId = 'some-other-id';

    await boundApi({ ...unbound });

    expect(chatComplete).toHaveBeenCalledTimes(1);
    expect(chatComplete).toHaveBeenCalledWith({
      connectorId: 'some-id',
      functionCalling: 'native',
      messages: unbound.messages,
    });
  });

  it('does not allow overriding bound parameters with the unbound object', async () => {
    const bound: BoundChatCompleteOptions = {
      connectorId: 'some-id',
      functionCalling: 'native',
    };

    const unbound = {
      messages: [{ role: MessageRole.User, content: 'hello there' }],
      connectorId: 'overridden',
    } as UnboundChatCompleteOptions;

    const boundApi = bindChatComplete(chatComplete, bound);

    await boundApi({ ...unbound });

    expect(chatComplete).toHaveBeenCalledTimes(1);
    expect(chatComplete).toHaveBeenCalledWith({
      connectorId: 'some-id',
      functionCalling: 'native',
      messages: unbound.messages,
    });
  });
});
