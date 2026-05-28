/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import {
  KI_ORIGIN_KIND_FEATURE,
  type KnowledgeIndicatorAttachmentData,
  type KnowledgeIndicatorFeatureAttachmentDataV1,
  type KnowledgeIndicatorQueryAttachmentDataV1,
} from '@kbn/streams-schema';

type FieldValue = string | number | boolean | undefined | null;
type FieldEntry = readonly [key: string, value: FieldValue];

const TAG_DELIMITER = ', ';

/**
 * User-visible fields for a Feature KI. The same list drives:
 *   - the chunk `content` indexed in SML (search recall),
 *   - the `format()` text shown to the LLM,
 *   - the `isStale` content fingerprint.
 *
 * Keep this list and the query equivalent ordered: `objectHash` sorts keys,
 * but the rendered text uses array order, so the visual layout is stable.
 */
const featureFieldEntries = (
  data: KnowledgeIndicatorFeatureAttachmentDataV1
): readonly FieldEntry[] => {
  const { feature, stream_name: streamName } = data;
  return [
    ['stream', streamName],
    ['title', feature.title ?? feature.id],
    ['type', feature.type],
    ['subtype', feature.subtype],
    ['description', feature.description],
    [
      'tags',
      feature.tags && feature.tags.length > 0 ? feature.tags.join(TAG_DELIMITER) : undefined,
    ],
    ['status', feature.status],
    ['confidence', feature.confidence],
    ['last_seen', feature.last_seen],
    ['expires_at', feature.expires_at],
    ['excluded_at', feature.excluded_at],
  ];
};

const queryFieldEntries = (
  data: KnowledgeIndicatorQueryAttachmentDataV1
): readonly FieldEntry[] => {
  const { query, stream_name: streamName, rule } = data;
  return [
    ['stream', streamName],
    ['title', query.title],
    ['description', query.description],
    ['type', query.type],
    ['severity_score', query.severity_score],
    ['rule_backed', rule.backed],
    ['rule_id', rule.id],
    ['esql', query.esql.query],
  ];
};

const kiFieldEntries = (data: KnowledgeIndicatorAttachmentData): readonly FieldEntry[] =>
  data.kind === KI_ORIGIN_KIND_FEATURE ? featureFieldEntries(data) : queryFieldEntries(data);

const isOmittable = (value: FieldValue): boolean =>
  value === undefined || value === null || value === '';

/**
 * Render the user-visible fields as a `key: value` multiline string. Falsy
 * values are dropped so the SML index and LLM-facing text don't carry literal
 * `undefined` / empty-string lines.
 */
export const serializeKiContent = (data: KnowledgeIndicatorAttachmentData): string =>
  kiFieldEntries(data)
    .filter(([, value]) => !isOmittable(value))
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

/**
 * Stable hash of the user-visible fields. Used as the canonical input for
 * `isStale` — two attachments are considered equivalent iff this hash matches.
 * The chunk `content` is built from the same field set so the search index
 * and the staleness check stay in lockstep.
 */
export const fingerprintKiContent = (data: KnowledgeIndicatorAttachmentData): string => {
  const fields = Object.fromEntries(
    kiFieldEntries(data).map(([key, value]) => [key, value ?? null])
  );
  return objectHash(
    { kind: data.kind, ...fields },
    { algorithm: 'sha1', encoding: 'hex', respectType: false, unorderedObjects: true }
  );
};

/**
 * Format a KI for the chat surface as a structured prefix + content block.
 * Reuses {@link serializeKiContent} so the LLM sees exactly the same field
 * set that the SML chunk indexed.
 */
export const formatKiAsText = (data: KnowledgeIndicatorAttachmentData): string => {
  const heading =
    data.kind === KI_ORIGIN_KIND_FEATURE ? 'Feature KI' : 'Significant event query KI';
  const body = serializeKiContent(data);
  return body ? `${heading}\n${body}` : heading;
};
