/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_TAG_LENGTH, MAX_TAGS } from '@kbn/alerting-v2-constants';
import { validateDuration, validateMaxDuration } from './validation';
import { ID_MAX_LENGTH, MAX_DURATION, MAX_DURATION_LENGTH } from './constants';

/**
 * Identifier for a resource a client can address and may name itself
 * (`PUT /rules/{id}`). Restricted to characters that survive a URL path
 * segment and a log line unambiguously, and that cannot differ byte-wise
 * while looking identical. The server-generated default is a UUID v4, which
 * satisfies it.
 *
 * Not trimmed: the value addresses a resource, so padding is rejected rather
 * than normalised into a lookup for a different id.
 */
const entityIdSchema = z
  .string()
  .min(1)
  .max(ID_MAX_LENGTH)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Must contain only letters, digits, underscores, and hyphens.');

/**
 * Identifier of an alert series. Always a server-generated SHA-256 digest, so
 * it is exactly 64 lowercase hex characters — callers echo back a value we
 * produced rather than composing one.
 */
const groupHashSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, 'Must be a 64-character lowercase hex SHA-256 digest.');

/** Semantics every client-addressable id carries; append to its `.describe()`. */
const ENTITY_ID_NOTE =
  'Chosen at creation and permanent — it cannot be changed afterwards. Re-using the id of a deleted resource is allowed but discouraged: execution history, change history, and alert episodes recorded under that id are retained and are attributed to the new resource. Ids appear in URLs and logs, so keep them free of sensitive data.';

const durationSchema = z
  .string()
  .max(MAX_DURATION_LENGTH, { abort: true })
  .superRefine((value, ctx) => {
    const formatError = validateDuration(value);
    if (formatError) {
      ctx.addIssue({ code: 'custom', message: formatError });
      return;
    }
    const maxError = validateMaxDuration(value, MAX_DURATION);
    if (maxError) {
      ctx.addIssue({ code: 'custom', message: maxError });
    }
  });

/**
 * Shared schema for tag arrays used across alerting v2 (rule metadata, action policies,
 * alert tag actions, tag filters). Each tag is up to `MAX_TAG_LENGTH` characters, up to
 * `MAX_TAGS` tags allowed.
 */
const tagsSchema = z.array(z.string().min(1).max(MAX_TAG_LENGTH)).max(MAX_TAGS);

/**
 * Caveat appended to every count in a list response: Elasticsearch stops counting hits at
 * 10,000 unless the read opts into an exact count, and no read promises to keep doing so.
 */
const ESTIMATED_COUNT_NOTE =
  'This count is an estimate: results above 10,000 may be reported as 10,000.';

/** Response shape of the tag endpoints: the unique tags, wrapped in an object. */
export const tagsResponseSchema = z
  .object({
    tags: z.array(z.string()).describe('The list of unique tags.'),
  })
  .describe('Wrapped tags response.');

export type TagsResponse = z.infer<typeof tagsResponseSchema>;

/**
 * Identity that performed a write, reported on `created_by` / `updated_by`.
 *
 * A user profile ID is recorded rather than a username because usernames and
 * full names change while a profile ID does not.
 *
 * The object shape (rather than a bare ID) exists so identity can be described
 * in more detail later. `profile_uid` is nullable so the three states stay
 * distinct: a `null` actor is a write with no user behind it (a background
 * task, say), `{ profile_uid: null }` is a user whose profile could not be
 * resolved, and a populated `profile_uid` is a fully attributed write.
 *
 * Deliberately not `.strict()`: additional identity fields are expected to be
 * added, and older clients should tolerate them.
 */
export const actorSchema = z
  .object({
    profile_uid: z
      .string()
      .nullable()
      .describe('User profile ID of the actor, or `null` when it cannot be resolved.'),
  })
  .describe('Identity that performed the write.')
  .meta({ id: 'alerting_actor' });

export type Actor = z.infer<typeof actorSchema>;

/** Make a schema optional while preserving its `.describe()` metadata. */
const optionalWithDescription = <T extends z.ZodType>(schema: T) => {
  const optional = schema.optional();
  return schema.description ? optional.describe(schema.description) : optional;
};

/**
 * Builds a schema that accepts either a single value or an array of values
 * and normalises both shapes to an array of length `1..max`.
 *
 * Intended for HTTP query parameters that can be delivered either as a single
 * value (`?key=a`) or as multiple occurrences (`?key=a&key=b`). The helper
 * absorbs the union/transform boilerplate at the parsing layer.
 *
 * The transform's explicit return type recovers `Array<z.output<T>>` for the
 * compiler. We intentionally skip the `.pipe(z.array(...))` re-validation
 * step: the single-value branch always produces a one-element array, which
 * trivially satisfies `min: 1`, and the array branch is already bounded by
 * `min`/`max` inside the union.
 *
 * @example
 *   const tagsQuerySchema = arrayOrSingleSchema(z.string().min(1).max(MAX_TAG_LENGTH), MAX_TAGS);
 */
const arrayOrSingleSchema = <T extends z.ZodType>(item: T, max: number) =>
  z
    .union([item, z.array(item).min(1).max(max)])
    .transform((value): Array<z.output<T>> => (Array.isArray(value) ? value : [value]));

/**
 * Bounded integer schema for HTTP query parameters. Query values arrive as
 * strings, so a numeric string is converted to a number before validation while
 * real numbers (programmatic callers, unit tests) pass through untouched.
 *
 * @example
 *   page: queryIntSchema({ min: 1, max: MAX }).default(1).describe('Page number.')
 */
const queryIntSchema = ({ min, max }: { min: number; max: number }) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value),
    z.number().int().min(min).max(max)
  );

export {
  durationSchema,
  entityIdSchema,
  groupHashSchema,
  tagsSchema,
  optionalWithDescription,
  arrayOrSingleSchema,
  queryIntSchema,
  ENTITY_ID_NOTE,
  ESTIMATED_COUNT_NOTE,
};
