/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamsUnitSecretsSchema, streamsUnitUiMetadataSchema } from '@kbn/streams-schema';
import type { StreamsUnit } from '@kbn/streams-schema';
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
 * PUT body after content-type dispatch. Omitted `ui_metadata` keeps the stored
 * canvas layout. A JSON body that includes `ui_metadata` replaces it.
 */
export interface ParsedUnitPutBody {
  unit: StreamsUnit.Configuration;
  ui_metadata?: StreamsUnit.UiMetadata;
  secrets?: StreamsUnit.Secrets;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const formatZodError = (field: string, error: z.ZodError): string =>
  error.issues
    .map((issue) => {
      const path = [field, ...issue.path].join('.');
      return `${path}: ${issue.message}`;
    })
    .join('; ');

const parseEnvelopeField = <T>(field: string, schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new StatusError(`Invalid Streams unit JSON: ${formatZodError(field, result.error)}`, 400);
  }

  return result.data;
};

const parseYamlUnit = (raw: string): ParsedUnitPutBody => {
  let parsed: unknown;

  try {
    parsed = YAML.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new StatusError(`Invalid Streams unit YAML: ${detail}`, 400);
  }

  return { unit: parsed as StreamsUnit.Configuration };
};

const parseJsonUpsert = (value: unknown): ParsedUnitPutBody => {
  if (!isRecord(value) || !('unit' in value)) {
    throw new StatusError('Invalid Streams unit JSON.', 400);
  }

  const parsed: ParsedUnitPutBody = {
    unit: value.unit as StreamsUnit.Configuration,
  };

  if (value.ui_metadata !== undefined) {
    parsed.ui_metadata = value.ui_metadata as StreamsUnit.UiMetadata;
  }

  if (value.secrets !== undefined) {
    parsed.secrets = value.secrets as StreamsUnit.Secrets;
  }

  return parsed;
};

const parseJsonRaw = (raw: string): ParsedUnitPutBody => {
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
 * - `application/json`: the `{ unit, ui_metadata?, secrets? }` envelope
 * - YAML (`application/yaml`, `text/yaml`, …): the authored unit document itself
 *
 * Content type only chooses how to decode the body. The config distributor
 * validates the unit document. YAML cannot carry `ui_metadata` or `secrets`;
 * those fields are omitted so a YAML push keeps the stored canvas layout and
 * credentials. Omitted JSON `ui_metadata` is also omitted (it is not defaulted
 * to `{}`).
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

/**
 * Checks Kibana-only `ui_metadata` and `secrets` after the distributor accepts the unit.
 */
export const assertUnitPutEnvelope = (
  parsed: ParsedUnitPutBody
): Pick<ParsedUnitPutBody, 'ui_metadata' | 'secrets'> => {
  const envelope: Pick<ParsedUnitPutBody, 'ui_metadata' | 'secrets'> = {};

  if (parsed.ui_metadata !== undefined) {
    envelope.ui_metadata = parseEnvelopeField(
      'ui_metadata',
      streamsUnitUiMetadataSchema,
      parsed.ui_metadata
    );
  }

  if (parsed.secrets !== undefined) {
    envelope.secrets = parseEnvelopeField('secrets', streamsUnitSecretsSchema, parsed.secrets);
  }

  return envelope;
};
