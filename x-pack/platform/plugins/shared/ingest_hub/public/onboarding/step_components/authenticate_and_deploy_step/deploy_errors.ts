/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Extracts a human-readable message from an unknown thrown value.
 *
 * Fleet's IHttpFetchError wraps the server's JSON body; the actual error detail lives at
 * body.message (or body.error), not at the top-level Error.message which is the HTTP status line.
 * Reading .message first, or falling through to String(), yields "[object Object]" for exactly
 * the errors worth showing.
 *
 * Priority order:
 *   1. body.message  — Fleet IHttpFetchError server detail
 *   2. message       — plain Error or any object with a message field
 *   3. body.error    — fallback field some endpoints use instead of body.message
 *   4. JSON.stringify(body) — last resort for structured but unrecognised bodies
 *   5. String(reason) — absolute fallback
 */
export function extractErrorMessage(reason: unknown): string {
  if (reason === null || reason === undefined) return 'Unknown error';

  if (typeof reason === 'string') return reason;

  if (typeof reason === 'object') {
    const err = reason as {
      body?: { message?: unknown; error?: unknown };
      message?: unknown;
    };

    const bodyMessage = err.body?.message;
    if (typeof bodyMessage === 'string' && bodyMessage.trim() !== '') return bodyMessage;

    if (typeof err.message === 'string' && err.message.trim() !== '') return err.message;

    const bodyError = err.body?.error;
    if (typeof bodyError === 'string' && bodyError.trim() !== '') return bodyError;

    // Last resort before String(): a JSON dump is ugly but still diagnosable, unlike
    // "[object Object]".
    try {
      const json = JSON.stringify(reason);
      if (json && json !== '{}') return json;
    } catch {
      // circular or non-serialisable — fall through
    }
  }

  return String(reason);
}
