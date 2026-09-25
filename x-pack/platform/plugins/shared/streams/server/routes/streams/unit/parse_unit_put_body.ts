/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { streamsUnitSchema, streamsUnitUpsertRequestSchema } from '@kbn/streams-schema';
import type { z } from '@kbn/zod/v4';
import YAML from 'yaml';
import { StatusError } from '../../../lib/streams/errors/status_error';

const YAML_MEDIA_TYPES = new Set([
  'application/yaml',
  'application/x-yaml',
  'text/yaml',
  'text/x-yaml',
]);

const JSON_MEDIA_TYPES = new Set(['application/json', 'application/vnd.api+json']);

const formatZodError = (error: z.ZodError): string =>
  error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'body';
      return `${path}: ${issue.message}`;
    })
    .join('; ');

const mediaTypeOf = (contentType: string | string[] | undefined): string => {
  const header = Array.isArray(contentType) ? contentType[0] : contentType;
  return header?.split(';')[0]?.trim().toLowerCase() ?? '';
};

const looksLikeJsonObject = (raw: string): boolean => raw.trimStart().startsWith('{');

const toUtf8 = (body: unknown): string => {
  if (body == null) {
    return '';
  }

  if (Buffer.isBuffer(body)) {
    return body.toString('utf8');
  }

  if (typeof body === 'string') {
    return body;
  }

  throw new StatusError('Request body must be JSON or YAML.', 400);
};

/**
 * PUT body after content-type dispatch. YAML omits `ui_metadata` so upsert
 * can keep the stored canvas layout (JSON `ui_metadata: {}` still replaces).
 */
export interface ParsedUnitPutBody {
  unit: StreamsUnit.Configuration;
  ui_metadata?: StreamsUnit.UiMetadata;
  secrets?: StreamsUnit.Secrets;
}

const parseYamlUnit = (raw: string): ParsedUnitPutBody => {
  let parsed: unknown;

  try {
    parsed = YAML.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new StatusError(`Invalid Streams unit YAML: ${detail}`, 400);
  }

  const result = streamsUnitSchema.safeParse(parsed);

  if (!result.success) {
    throw new StatusError(`Invalid Streams unit YAML: ${formatZodError(result.error)}`, 400);
  }

  return { unit: result.data };
};

const parseJsonUpsert = (value: unknown): StreamsUnit.UpsertRequest => {
  const result = streamsUnitUpsertRequestSchema.safeParse(value);

  if (!result.success) {
    throw new StatusError(`Invalid Streams unit JSON: ${formatZodError(result.error)}`, 400);
  }

  return result.data;
};

const parseJsonRaw = (raw: string): StreamsUnit.UpsertRequest => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new StatusError('Invalid Streams unit JSON.', 400);
  }

  return parseJsonUpsert(parsed);
};

/**
 * PUT `/internal/streams/unit/{id}` accepts:
 * - `application/json`: the existing `{ unit, ui_metadata, secrets? }` envelope
 * - YAML (`application/yaml`, `text/yaml`, …): the authored unit document itself
 *
 * YAML cannot carry `ui_metadata` or `secrets`; those fields are omitted so a
 * YAML push keeps the stored canvas layout and credentials.
 */
export const parseUnitPutBody = ({
  body,
  contentType,
}: {
  body: unknown;
  contentType: string | string[] | undefined;
}): ParsedUnitPutBody => {
  if (body != null && typeof body === 'object' && !Buffer.isBuffer(body) && !Array.isArray(body)) {
    return parseJsonUpsert(body);
  }

  const raw = toUtf8(body);

  if (raw.trim() === '') {
    throw new StatusError('Request body is required.', 400);
  }

  const mediaType = mediaTypeOf(contentType);

  if (YAML_MEDIA_TYPES.has(mediaType) || mediaType === 'text/plain') {
    return parseYamlUnit(raw);
  }

  if (JSON_MEDIA_TYPES.has(mediaType) || mediaType.endsWith('+json')) {
    return parseJsonRaw(raw);
  }

  if (looksLikeJsonObject(raw)) {
    return parseJsonRaw(raw);
  }

  if (
    mediaType === '' ||
    mediaType === 'application/octet-stream' ||
    mediaType === 'application/x-www-form-urlencoded' ||
    mediaType.startsWith('text/')
  ) {
    return parseYamlUnit(raw);
  }

  throw new StatusError(
    `Unsupported Content-Type [${mediaType}]. Use application/json or application/yaml.`,
    400
  );
};
