/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getMockHttpFetchStreamingResponse() {
  // Mock the response for streaming to simulate SSE events
  const mockSseData = { type: 'content', content: 'Streamed response part' };
  const sseEventString = `data: ${JSON.stringify(mockSseData)}\n\n`;
  const mockRead = jest
    .fn()
    .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(sseEventString) })
    .mockResolvedValueOnce({ done: true, value: undefined });

  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'Content-Type': 'text/event-stream' }),
    response: {
      body: {
        getReader: () => ({
          read: mockRead,
          cancel: jest.fn(),
        }),
      } as unknown as ReadableStream<Uint8Array>,
    },
  };
}
