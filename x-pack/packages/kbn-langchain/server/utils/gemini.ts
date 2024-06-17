/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamParser } from './types';

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
      const splitByQuotes = parsed.split(`"`);
      splitByQuotes.forEach((chunkk, index) => {
        // add quote back on except for last chunk
        const splitBySpace = `${chunkk}${index === splitByQuotes.length - 1 ? '' : '"'}`.split(` `);

        for (const char of splitBySpace) {
          tokenHandler(`${char} `);
        }
      });
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
