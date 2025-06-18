/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { ChatCompleteAPI, MessageRole, ChatCompleteOptions } from '@kbn/inference-common';
import { createChatCompleteRestApi } from './chat_complete';
import { getMockHttpFetchStreamingResponse } from '../utils/mock_http_fetch_streaming';

describe('createChatCompleteRestApi', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  let chatComplete: ChatCompleteAPI;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
    chatComplete = createChatCompleteRestApi({ fetch: http.fetch });
  });

  it('calls http.fetch with the right parameters when stream is not true', async () => {
    const params = {
      connectorId: 'my-connector',
      functionCalling: 'native',
      system: 'system',
      temperature: 0.5,
      modelName: 'gpt-4o',
      messages: [{ role: MessageRole.User, content: 'question' }],
    } satisfies ChatCompleteOptions;

    http.fetch.mockResolvedValue({});

    await chatComplete(params);

    expect(http.fetch).toHaveBeenCalledTimes(1);
    expect(http.fetch).toHaveBeenCalledWith('/internal/inference/chat_complete', {
      method: 'POST',
      body: expect.any(String),
    });
    const callBody = http.fetch.mock.lastCall!;

    expect(JSON.parse((callBody as any[])[1].body as string)).toEqual(params);
  });

  it('calls http.fetch with the right parameters when stream is true', async () => {
    const params = {
      connectorId: 'my-connector',
      functionCalling: 'native',
      stream: true,
      temperature: 0.4,
      modelName: 'gemini-1.5',
      system: 'system',
      messages: [{ role: MessageRole.User, content: 'question' }],
    };

    http.fetch.mockResolvedValue(getMockHttpFetchStreamingResponse());

    await chatComplete(params as ChatCompleteOptions);

    expect(http.fetch).toHaveBeenCalledTimes(1);
    expect(http.fetch).toHaveBeenCalledWith('/internal/inference/chat_complete/stream', {
      method: 'POST',
      asResponse: true,
      rawResponse: true,
      body: expect.any(String),
    });
    const callBody = http.fetch.mock.lastCall!;

    expect(JSON.parse((callBody as any[])[1].body as string)).toEqual(omit(params, 'stream'));
  });
});
