/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { charset as mimeCharset } from 'mime-types';

export type ResponseBuffer = Buffer | ArrayBuffer | ArrayBufferView | null | undefined;

const isTextContentType = (contentType: string | null | undefined): boolean => {
  if (!contentType) return false;
  const mimeType = contentType.split(';')[0].trim().toLowerCase();
  if (mimeType.startsWith('text/')) return true;
  if (mimeType.endsWith('+json') || mimeType.endsWith('+xml')) return true;
  return !!mimeCharset(mimeType);
};

function toResponseBuffer(data: ResponseBuffer): Buffer {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  if (data == null) {
    return Buffer.alloc(0);
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  return Buffer.from(data as ArrayLike<number>);
}

function getContentTypeHeader(headers: Record<string, string>): string | null {
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'content-type') {
      return value;
    }
  }
  return null;
}

/**
 * Processes an HTTP response body received as raw bytes (e.g. from an Axios
 * request made with `responseType: 'arraybuffer'`).
 *
 * - Text content types (text/*, application/json, +json/+xml, etc.): decoded as
 *   UTF-8 and JSON-parsed, falling back to the plain string if JSON parsing fails.
 * - Binary content types (images, PDFs, octet-stream, unknown types, missing
 *   Content-Type): returned as a base64-encoded string. This avoids the lossy
 *   UTF-8 decoding that would otherwise corrupt non-UTF-8 byte sequences, while
 *   keeping the result JSON-serializable for downstream consumers.
 */
export const processBufferResponse = (
  data: ResponseBuffer,
  headers: Record<string, string>
): unknown => {
  const buffer = toResponseBuffer(data);
  const contentType = getContentTypeHeader(headers);

  if (!isTextContentType(contentType)) {
    return buffer.toString('base64');
  }

  const text = buffer.toString('utf-8');
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};
