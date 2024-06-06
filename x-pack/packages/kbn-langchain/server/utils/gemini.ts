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
  let responseBody2 = '';
  stream.on('data', (chunk) => {
    const decoded = chunk.toString();
    const parsed = parseGeminiResponse(decoded);
    if (tokenHandler) {
      tokenHandler(parsed);
    }
    responseBody += decoded;
    responseBody2 += parsed;
  });
  return new Promise((resolve, reject) => {
    stream.on('end', () => {
      console.log('stephhh END responseBody', responseBody2);
      const parsed = parseGeminiResponse(responseBody);
      console.log('stephhh END parsed', parsed);
      resolve(parseGeminiResponse(responseBody));
    });
    stream.on('error', (err) => {
      reject(err);
    });
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        stream.destroy();
        resolve(parseGeminiResponse(responseBody));
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
//
// export const parseGeminiStream: StreamParser = async (
//   responseStream,
//   logger,
//   abortSignal,
//   tokenHandler
// ) => {
//   const responseChunks: string[] = [];
//   const decoder = new TextDecoder();
//   if (abortSignal) {
//     abortSignal.addEventListener('abort', () => {
//       responseStream.destroy(new Error('Aborted'));
//       return parseGeminiChunks(responseChunks, logger);
//     });
//   }
//   responseStream.on('data', (chunk) => {
//     const value = decoder.decode(chunk, { stream: true });
//     console.log('stephhh value', value);
//     const lines = value.split('\r');
//     console.log('stephhh lines', lines);
//     const parsedLines = parseGeminiChunks(lines, logger);
//     console.log('stephhh parsedLines', parsedLines);
//     const parsedChunk = parsedLines[0];
//     responseChunks.push(parsedChunk);
//     if (tokenHandler) {
//       tokenHandler(parsedChunk);
//     }
//   });
//
//   await finished(responseStream).catch((err) => {
//     if (abortSignal?.aborted) {
//       logger.info('Gemini stream parsing was aborted.');
//     } else {
//       throw err;
//     }
//   });
//
//   return responseChunks.join(); // parseGeminiChunks(responseChunks, logger);
// };
//
// const parseGeminiChunks = (chunks: string[], logger: Logger) => {
//   return chunks
//     .filter((str) => !!str && str !== '[DONE]')
//     .map((line) => {
//       try {
//         const newLine = line.replaceAll('data: ', '');
//         const geminiResponse: GeminiResponseSchema = JSON.parse(newLine);
//         return geminiResponse.candidates[0]?.content.parts.map((part) => part.text).join('') ?? '';
//       } catch (err) {
//         return '';
//       }
//     });
// };
