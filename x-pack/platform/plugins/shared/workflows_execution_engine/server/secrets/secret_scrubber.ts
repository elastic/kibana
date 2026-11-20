/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECRET_VALUE_MIN_LENGTH } from '@kbn/secrets';
import { ExecutionError } from '@kbn/workflows/server';
import { SECRET_MASK } from './secret_mask';

/** Replaces the secret values a step used with the mask, wherever they appear in its results. */
export interface SecretScrubber {
  scrubText(text: string): string;
  /** Scrubs every string in a JSON-like value, keys included. Other values are returned as is. */
  scrub(value: unknown): unknown;
  scrubError(error: ExecutionError): ExecutionError;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

// The forms in which a service is likely to send a value back: as is, URL-encoded (as a
// query value, as part of a whole URL, or as form data), base64 and escaped inside a JSON
// string. A value combined with other text before being encoded (Basic auth, for example)
// is not found.
const getForms = (value: string): string[] => {
  const bytes = Buffer.from(value, 'utf8');
  return [
    value,
    encodeURIComponent(value),
    encodeURI(value),
    new URLSearchParams({ value }).toString().slice('value='.length),
    bytes.toString('base64'),
    bytes.toString('base64url'),
    JSON.stringify(value).slice(1, -1),
  ];
};

/**
 * Creates the scrubber for the secret values one step used. It is best effort: it finds the
 * forms listed in `getForms` and nothing else.
 */
export const createSecretScrubber = ({ values }: { values: readonly string[] }): SecretScrubber => {
  // A shorter value would match unrelated text. Secrets stored in Kibana are never shorter.
  const scrubbable = values.filter((value) => value.length >= SECRET_VALUE_MIN_LENGTH);
  // Longest first, so that a form containing another one is replaced as a whole.
  const forms = [...new Set(scrubbable.flatMap(getForms))].sort(
    (first, second) => second.length - first.length
  );

  const scrubText = (text: string): string => {
    let scrubbed = text;
    for (const form of forms) {
      scrubbed = scrubbed.replaceAll(form, SECRET_MASK);
    }
    return scrubbed;
  };

  const scrubRecord = (record: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(
      Object.entries(record).map(([key, value]) => [scrubText(key), scrub(value)])
    );

  const scrub = (value: unknown): unknown => {
    if (typeof value === 'string') {
      return scrubText(value);
    }
    if (Array.isArray(value)) {
      return value.map(scrub);
    }
    return isRecord(value) ? scrubRecord(value) : value;
  };

  return {
    scrubText,
    scrub,
    scrubError: ({ type, message, details, retryable }) =>
      new ExecutionError({
        type,
        message: scrubText(message),
        ...(details ? { details: scrubRecord(details) } : {}),
        ...(retryable === undefined ? {} : { retryable }),
      }),
  };
};
