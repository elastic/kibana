/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { Readable } from 'stream';
import { StreamParser } from './types';

export const parseGeminiStreamAsAsyncIterator = async function* (
  stream: Readable,
  logger: Logger,
  abortSignal?: AbortSignal
) {
  if (abortSignal) {
    abortSignal.addEventListener('abort', () => {
      stream.destroy();
    });
  }
  try {
    for await (const chunk of stream) {
      const decoded = chunk.toString();
      const parsed = parseGeminiResponse(decoded);
      // Split the parsed string into chunks of 5 characters
      for (let i = 0; i < parsed.length; i += 5) {
        yield parsed.substring(i, i + 5);
      }
    }
  } catch (err) {
    if (abortSignal?.aborted) {
      logger.info('Gemini stream parsing was aborted.');
    } else {
      throw err;
    }
  }
};

export const parseGeminiStream: StreamParser = async (
  stream,
  logger,
  abortSignal,
  tokenHandler
) => {
  let responseBody = '';
  stream.on('data', (chunk) => {
    const decoded = chunk.toString();
    const parsed = parseGeminiResponse(decoded);
    if (tokenHandler) {
      // Split the parsed string into chunks of 5 characters
      for (let i = 0; i < parsed.length; i += 5) {
        tokenHandler(parsed.substring(i, i + 5));
      }
    }
    responseBody += parsed;
  });
  return new Promise((resolve, reject) => {
    stream.on('end', () => {
      resolve(responseBody);
    });
    stream.on('error', (err) => {
      reject(err);
    });
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        logger.info('Bedrock stream parsing was aborted.');
        stream.destroy();
        resolve(responseBody);
      });
    }
  });
};

/** Parse Gemini stream response body */
export const parseGeminiResponse = (responseBody: string) => {
  return responseBody
    .split('\n')
    .filter((line) => line.startsWith('data: ') && !line.endsWith('[DONE]'))
    .map((line) => JSON.parse(line.replace('data: ', '')))
    .filter(
      (
        line
      ): line is {
        candidates: Array<{
          content: { role: string; parts: Array<{ text: string }> };
          finishReason: string;
          safetyRatings: Array<{ category: string; probability: string }>;
        }>;
        usageMetadata: {
          promptTokenCount: number;
          candidatesTokenCount: number;
          totalTokenCount: number;
        };
      } => 'candidates' in line
    )
    .reduce((prev, line) => {
      if (line.candidates[0] && line.candidates[0].content) {
        const parts = line.candidates[0].content.parts;
        const text = parts.map((part) => part.text).join('');
        return prev + text;
      }
      return prev;
    }, '');
};
