/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { EventStreamCodec } from '@smithy/eventstream-codec';
import { fromUtf8, toUtf8 } from '@smithy/util-utf8';

/**
 * Parses a Bedrock buffer from an array of chunks.
 *
 * @param {Uint8Array[]} chunks - Array of Uint8Array chunks to be parsed.
 * @returns {string} - Parsed string from the Bedrock buffer.
 */
export const parseBedrockBuffer = (chunks: Uint8Array[], logger: Logger): string => {
  // Initialize an empty Uint8Array to store the concatenated buffer.
  let bedrockBuffer: Uint8Array = new Uint8Array(0);

  // Map through each chunk to process the Bedrock buffer.
  return chunks
    .map((chunk) => {
      const processedChunk = handleBedrockChunk({ chunk, bedrockBuffer, logger });
      bedrockBuffer = processedChunk.bedrockBuffer;
      return processedChunk.decodedChunk;
    })
    .join('');
};

/**
 * Handle a chunk of data from the bedrock API.
 * @param chunk - The chunk of data to process.
 * @param bedrockBuffer - The buffer containing the current data.
 * @param chunkHandler - Optional function to handle the chunk once it has been processed.
 * @returns {decodedChunk, bedrockBuffer } - The decoded chunk and the updated buffer.
 */
export const handleBedrockChunk = ({
  chunk,
  bedrockBuffer,
  chunkHandler,
  logger,
}: {
  chunk: Uint8Array;
  bedrockBuffer: Uint8Array;
  chunkHandler?: (chunk: string) => void;
  logger?: Logger;
}): { decodedChunk: string; bedrockBuffer: Uint8Array } => {
  // Concatenate the current chunk to the existing buffer.
  let newBuffer = concatChunks(bedrockBuffer, chunk);
  // Get the length of the next message in the buffer.
  let messageLength = getMessageLength(newBuffer);
  // Initialize an array to store fully formed message chunks.
  const buildChunks = [];
  // Process the buffer until no complete messages are left.
  while (newBuffer.byteLength > 0 && newBuffer.byteLength >= messageLength) {
    // Extract a chunk of the specified length from the buffer.
    const extractedChunk = newBuffer.slice(0, messageLength);
    // Add the extracted chunk to the array of fully formed message chunks.
    buildChunks.push(extractedChunk);
    // Remove the processed chunk from the buffer.
    newBuffer = newBuffer.slice(messageLength);
    // Get the length of the next message in the updated buffer.
    messageLength = getMessageLength(newBuffer);
  }

  const awsDecoder = new EventStreamCodec(toUtf8, fromUtf8);

  // Decode and parse each message chunk, extracting the completion.
  const decodedChunk = buildChunks
    .map((bChunk) => {
      const event = awsDecoder.decode(bChunk);
      const body = JSON.parse(
        Buffer.from(JSON.parse(new TextDecoder().decode(event.body)).bytes, 'base64').toString()
      );
      const decodedContent = prepareBedrockOutput(body, logger);
      if (chunkHandler) {
        chunkHandler(decodedContent);
      }
      return decodedContent;
    })
    .join('');
  return { decodedChunk, bedrockBuffer: newBuffer };
};

/**
 * Gets the length of the next message from the buffer.
 *
 * @param {Uint8Array} buffer - Buffer containing the message.
 * @returns {number} - Length of the next message.
 */
function getMessageLength(buffer: Uint8Array): number {
  // If the buffer is empty, return 0.
  if (buffer.byteLength === 0) return 0;
  // Create a DataView to read the Uint32 value at the beginning of the buffer.
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  // Read and return the Uint32 value (message length).
  return view.getUint32(0, false);
}

/**
 * Concatenates two Uint8Array buffers.
 *
 * @param {Uint8Array} a - First buffer.
 * @param {Uint8Array} b - Second buffer.
 * @returns {Uint8Array} - Concatenated buffer.
 */
function concatChunks(a: Uint8Array, b: Uint8Array): Uint8Array {
  const newBuffer = new Uint8Array(a.length + b.length);
  // Copy the contents of the first buffer to the new buffer.
  newBuffer.set(a);
  // Copy the contents of the second buffer to the new buffer starting from the end of the first buffer.
  newBuffer.set(b, a.length);
  return newBuffer;
}

interface CompletionChunk {
  type?: string;
  delta?: {
    type?: string;
    text?: string;
    stop_reason?: null | string;
    stop_sequence?: null | string;
  };
  message?: { content: Array<{ text?: string; type: string }> };
  content_block?: { type: string; text: string };
}

/**
 * Prepare the streaming output from the bedrock API
 * @param responseBody
 * @returns string
 */
const prepareBedrockOutput = (responseBody: CompletionChunk, logger?: Logger): string => {
  if (responseBody.type && responseBody.type.length) {
    if (responseBody.type === 'message_start' && responseBody.message) {
      return parseContent(responseBody.message.content);
    } else if (
      responseBody.type === 'content_block_delta' &&
      responseBody.delta?.type === 'text_delta' &&
      typeof responseBody.delta?.text === 'string'
    ) {
      return responseBody.delta.text;
    }
  }
  logger?.warn(`Failed to parse bedrock chunk ${JSON.stringify(responseBody)}`);
  return '';
};

/**
 * Parse the content from the bedrock API
 * @param content
 * @returns string
 */
function parseContent(content: Array<{ text?: string; type: string }>): string {
  let parsedContent = '';
  if (content.length === 1 && content[0].type === 'text' && content[0].text) {
    parsedContent = content[0].text;
  } else if (content.length > 1) {
    // this case should not happen, but here is a fallback
    parsedContent = content.reduce((acc, { text }) => (text ? `${acc}\n${text}` : acc), '');
  }
  return parsedContent;
}
