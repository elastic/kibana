/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import type { EventsService } from '../events';
import { ChatService } from './chat_service';

describe('ChatService.postBrowserToolResult', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  let chatService: ChatService;

  const post = () =>
    chatService.postBrowserToolResult({
      executionId: 'exec-1',
      toolCallId: 'call-1',
      clientId: 'client-1',
      result: { status: 'ok', content: 'done' },
    });

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
    chatService = new ChatService({ http, events: {} as EventsService });
  });

  it("posts the result and returns 'accepted' on 204", async () => {
    http.post.mockResolvedValue(undefined);

    await expect(post()).resolves.toBe('accepted');
    expect(http.post).toHaveBeenCalledWith(
      '/internal/agent_builder/executions/exec-1/browser_tool_results/call-1',
      { body: JSON.stringify({ client_id: 'client-1', result: { status: 'ok', content: 'done' } }) }
    );
  });

  it.each([404, 409])("returns 'final' on %s (response status)", async (status) => {
    http.post.mockRejectedValue({ response: { status } });
    await expect(post()).resolves.toBe('final');
  });

  it.each([404, 409])("returns 'final' on %s (body statusCode)", async (statusCode) => {
    http.post.mockRejectedValue({ body: { statusCode } });
    await expect(post()).resolves.toBe('final');
  });

  it('rethrows a 500', async () => {
    const error = { response: { status: 500 } };
    http.post.mockRejectedValue(error);
    await expect(post()).rejects.toBe(error);
  });

  it('rethrows a 500 reported in the body', async () => {
    const error = { body: { statusCode: 500 } };
    http.post.mockRejectedValue(error);
    await expect(post()).rejects.toBe(error);
  });
});
