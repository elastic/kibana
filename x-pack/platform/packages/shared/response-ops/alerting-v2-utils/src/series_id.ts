/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ID_MAX_LENGTH } from '@kbn/alerting-v2-schemas';

const SERIES_ID_VERSION = '1';
const SEPARATOR = '::';
const INTERNAL_SOURCE = 'internal';
const GROUP_HASH_LENGTH = 64;
const GROUP_HASH_PATTERN = /^[a-f0-9]{64}$/;
/** The segments read from the left of the payload: version, kind and space. */
const LEADING_SEGMENTS = 3;
const SPACE_ID_PATTERN = /^[a-z0-9_-]+$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

/** Fields every `.rule-events` and `.alert-actions` document carries, from which a series id derives. */
export interface SeriesRef {
  space_id: string;
  group_hash: string;
  rule_id?: string | null;
  source?: string | null;
}

export type DecodedSeriesId =
  | { kind: 'rule'; space_id: string; rule_id: string; group_hash: string }
  | { kind: 'source'; space_id: string; source: string; group_hash: string };

export class InvalidSeriesIdError extends Error {
  constructor(reason: string) {
    super(`Invalid series id: ${reason}`);
    this.name = 'InvalidSeriesIdError';
  }
}

const toBase64Url = (value: string): string => {
  const binary = Array.from(new TextEncoder().encode(value), (byte) =>
    String.fromCharCode(byte)
  ).join('');

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (value: string): string => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

  try {
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new InvalidSeriesIdError('not valid base64url-encoded UTF-8');
  }
};

/**
 * Builds the id of the series a document belongs to: base64url of
 * `1::rule::{space_id}::{rule_id}::{group_hash}` for rule-backed series and
 * `1::source::{space_id}::{source}::{group_hash}` for external ones. A missing, empty or
 * `internal` source is rule-backed: an empty source is never an external owner. Mirrors the
 * `SERIES_ID_EVAL` ES|QL expression byte for byte. Returns `null` when the document carries no
 * owner, as that expression does.
 */
export const encodeSeriesId = ({
  space_id: spaceId,
  group_hash: groupHash,
  rule_id: ruleId,
  source,
}: SeriesRef): string | null => {
  const isRuleBacked = !source || source === INTERNAL_SOURCE;
  const owner = isRuleBacked ? ruleId : source;

  if (!owner) {
    return null;
  }

  return toBase64Url(
    [SERIES_ID_VERSION, isRuleBacked ? 'rule' : 'source', spaceId, owner, groupHash].join(SEPARATOR)
  );
};

/**
 * Splits a payload into the version, kind and space read from the left, and the
 * remainder (`{owner}::{group_hash}`). Reading by position rather than splitting
 * on every separator keeps an owner that contains colons intact, including one
 * ending in an odd number of them (`pagerduty:`), where splitting would attach
 * the owner's last colon to the hash.
 */
const readLeadingSegments = (payload: string): { segments: string[]; remainder: string } => {
  const segments: string[] = [];
  let cursor = 0;

  while (segments.length < LEADING_SEGMENTS) {
    const end = payload.indexOf(SEPARATOR, cursor);
    if (end === -1) {
      break;
    }
    segments.push(payload.slice(cursor, end));
    cursor = end + SEPARATOR.length;
  }

  return { segments, remainder: payload.slice(cursor) };
};

/**
 * Parses a series id into the indexed fields that identify the series. The
 * version, kind and space are the first three segments and the hash is always
 * the last 64 characters, so an owner containing the separator, or colons at
 * either end (only possible for an external `source`), still parses.
 *
 * @throws {InvalidSeriesIdError} when the id is not a version 1 series id.
 */
export const decodeSeriesId = (seriesId: string): DecodedSeriesId => {
  if (!BASE64URL_PATTERN.test(seriesId)) {
    throw new InvalidSeriesIdError('not base64url');
  }

  const { segments, remainder } = readLeadingSegments(fromBase64Url(seriesId));
  const [version, kind, spaceId] = segments;

  if (version !== SERIES_ID_VERSION) {
    throw new InvalidSeriesIdError(`unsupported version [${version}]`);
  }
  if (kind !== 'rule' && kind !== 'source') {
    throw new InvalidSeriesIdError(`unknown kind [${kind}]`);
  }
  if (spaceId === undefined || !SPACE_ID_PATTERN.test(spaceId)) {
    throw new InvalidSeriesIdError('malformed space');
  }

  // The remainder is `{owner}::{group_hash}`, so it holds at least one owner character.
  const ownerEnd = remainder.length - GROUP_HASH_LENGTH - SEPARATOR.length;
  if (ownerEnd < 1) {
    throw new InvalidSeriesIdError('malformed owner');
  }

  const owner = remainder.slice(0, ownerEnd);
  const groupHash = remainder.slice(ownerEnd + SEPARATOR.length);

  if (
    remainder.slice(ownerEnd, ownerEnd + SEPARATOR.length) !== SEPARATOR ||
    !GROUP_HASH_PATTERN.test(groupHash)
  ) {
    throw new InvalidSeriesIdError('malformed group hash');
  }
  if (owner.length > ID_MAX_LENGTH) {
    throw new InvalidSeriesIdError('malformed owner');
  }
  // An `internal` source is rule-backed and never encoded as a `source` series;
  // matching on it would span every rule that shares the hash.
  if (kind === 'source' && owner === INTERNAL_SOURCE) {
    throw new InvalidSeriesIdError('malformed owner');
  }

  return kind === 'rule'
    ? { kind, space_id: spaceId, rule_id: owner, group_hash: groupHash }
    : { kind, space_id: spaceId, source: owner, group_hash: groupHash };
};
