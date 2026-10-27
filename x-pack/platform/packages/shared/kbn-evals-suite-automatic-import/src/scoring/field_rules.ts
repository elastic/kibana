/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsFields } from './ecs_fields';

/** Fields set by the pipeline, integration framework, or integration settings rather than parsed from the log. */
const UNSCORED_FIELDS: readonly string[] = [
  'ecs.version',
  'event.dataset',
  'event.ingested',
  'event.module',
  'event.original',
  'event.timezone',
  'tags',
];

/** Data stream metadata, pipeline errors, GeoIP/ASN enrichment, and `related.*` copies. */
const UNSCORED_PATTERNS: readonly RegExp[] = [/^(data_stream|error|related)\./, /(^|\.)(geo|as)\./];

/** Fields that say what kind of event a line is, which detection rules and dashboards rely on. */
export const CATEGORIZATION_FIELDS: readonly string[] = [
  'event.kind',
  'event.category',
  'event.type',
  'event.outcome',
];

/**
 * Field groups that ECS allows for the same entity, so `client.ip` and `source.ip` count as the
 * same field, as do `host.os.name` and `observer.os.name`.
 */
const EQUIVALENT_FIELD_GROUPS: ReadonlyArray<readonly [string, string]> = [
  ['client', 'source'],
  ['server', 'destination'],
  ['host', 'observer'],
];

const swapGroup = (field: string, from: string, to: string): string[] =>
  field.startsWith(`${from}.`) ? [`${to}${field.slice(from.length)}`] : [];

/** The expected field plus any fields that are equivalent to it. */
export const acceptedFields = (field: string): readonly string[] => [
  field,
  ...EQUIVALENT_FIELD_GROUPS.flatMap(([a, b]) => [
    ...swapGroup(field, a, b),
    ...swapGroup(field, b, a),
  ]),
];

/** Whether an expected field counts toward the score: an ECS field that comes from the log itself. */
export const isScoredField = (
  field: string,
  sampleUnscoredFields: readonly string[],
  ecsFields: EcsFields
): boolean =>
  ecsFields.has(field) &&
  !sampleUnscoredFields.includes(field) &&
  !UNSCORED_FIELDS.includes(field) &&
  !UNSCORED_PATTERNS.some((pattern) => pattern.test(field));
