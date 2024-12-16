/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { parseGeminiStream, parseGeminiResponse } from './gemini';
import { loggerMock } from '@kbn/logging-mocks';

describe('parseGeminiStream', () => {
  const mockLogger = loggerMock.create();
  let mockStream: Readable;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStream = new Readable({
      read() {},
    });
  });

  it('should parse the stream correctly', async () => {
    const data =
      'data: {"candidates":[{"content":{"role":"system","parts":[{"text":"Hello"}]},"finishReason":"stop","safetyRatings":[{"category":"safe","probability":"low"}]}],"usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":10,"totalTokenCount":20}}\n';
    mockStream.push(data);
    mockStream.push(null);

    const result = await parseGeminiStream(mockStream, mockLogger);
    expect(result).toBe('Hello');
  });

  it('should handle abort signal correctly', async () => {
    const abortSignal = new AbortController().signal;
    setTimeout(() => {
      abortSignal.dispatchEvent(new Event('abort'));
    }, 100);

    const result = parseGeminiStream(mockStream, mockLogger, abortSignal);

    await expect(result).resolves.toBe('');
    expect(mockLogger.info).toHaveBeenCalledWith('Bedrock stream parsing was aborted.');
  });

  it('should call tokenHandler with correct tokens', async () => {
    const data =
      'data: {"candidates":[{"content":{"role":"system","parts":[{"text":"Hello world"}]},"finishReason":"stop","safetyRatings":[{"category":"safe","probability":"low"}]}],"usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":10,"totalTokenCount":20}}\n';
    mockStream.push(data);
    mockStream.push(null);

    const tokenHandler = jest.fn();
    await parseGeminiStream(mockStream, mockLogger, undefined, tokenHandler);

    expect(tokenHandler).toHaveBeenCalledWith('Hello');
    expect(tokenHandler).toHaveBeenCalledWith(' worl');
    expect(tokenHandler).toHaveBeenCalledWith('d');
  });

  it('should handle stream error correctly', async () => {
    const error = new Error('Stream error');
    const resultPromise = parseGeminiStream(mockStream, mockLogger);

    mockStream.emit('error', error);

    await expect(resultPromise).rejects.toThrow('Stream error');
  });
});

describe('parseGeminiResponse', () => {
  it('should parse response correctly', () => {
    const response =
      'data: {"candidates":[{"content":{"role":"system","parts":[{"text":"Hello"}]},"finishReason":"stop","safetyRatings":[{"category":"safe","probability":"low"}]}],"usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":10,"totalTokenCount":20}}\n';
    const result = parseGeminiResponse(response);
    expect(result).toBe('Hello');
  });

  it('should ignore lines that do not start with data: ', () => {
    const response =
      'invalid line\ndata: {"candidates":[{"content":{"role":"system","parts":[{"text":"Hello"}]},"finishReason":"stop","safetyRatings":[{"category":"safe","probability":"low"}]}],"usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":10,"totalTokenCount":20}}\n';
    const result = parseGeminiResponse(response);
    expect(result).toBe('Hello');
  });

  it('should ignore lines that end with [DONE]', () => {
    const response =
      'data: {"candidates":[{"content":{"role":"system","parts":[{"text":"Hello"}]},"finishReason":"stop","safetyRatings":[{"category":"safe","probability":"low"}]}],"usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":10,"totalTokenCount":20}}\ndata: [DONE]';
    const result = parseGeminiResponse(response);
    expect(result).toBe('Hello');
  });
});
