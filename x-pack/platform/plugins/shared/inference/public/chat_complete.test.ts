/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { ChatCompleteAPI, MessageRole, ChatCompleteOptions } from '@kbn/inference-common';
import { createChatCompleteApi } from './chat_complete';

describe('createChatCompleteApi', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  let chatComplete: ChatCompleteAPI;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
    chatComplete = createChatCompleteApi({ http });
  });

  it('calls http.post with the right parameters when stream is not true', async () => {
    const params = {
      connectorId: 'my-connector',
      functionCalling: 'native',
      system: 'system',
      messages: [{ role: MessageRole.User, content: 'question' }],
    };
    await chatComplete(params as ChatCompleteOptions);

    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledWith('/internal/inference/chat_complete', {
      body: expect.any(String),
    });
    const callBody = http.post.mock.lastCall!;

    expect(JSON.parse((callBody as any[])[1].body as string)).toEqual(params);
  });

  it('calls http.post with the right parameters when stream is true', async () => {
    http.post.mockResolvedValue({});

    const params = {
      connectorId: 'my-connector',
      functionCalling: 'native',
      stream: true,
      system: 'system',
      messages: [{ role: MessageRole.User, content: 'question' }],
    };

    await chatComplete(params as ChatCompleteOptions);

    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledWith('/internal/inference/chat_complete/stream', {
      asResponse: true,
      rawResponse: true,
      body: expect.any(String),
    });
    const callBody = http.post.mock.lastCall!;

    expect(JSON.parse((callBody as any[])[1].body as string)).toEqual(omit(params, 'stream'));
  });
});
