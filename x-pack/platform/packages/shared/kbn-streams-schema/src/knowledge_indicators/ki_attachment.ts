/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { featureSchema } from '../feature';
import { streamQuerySchema } from '../queries';

/**
 * Shared identifier used for both the SML type (indexed in `.chat-sml-data`)
 * and the Agent Builder attachment type. Keeping them identical means the
 * `sml_attach` tool can pass the SML type through unchanged to the attachment
 * registry.
 */
export const KI_SML_TYPE = 'knowledge_indicator';
export const KI_ATTACHMENT_TYPE = 'knowledge_indicator';

/** Discriminator values used in the unified KI payload. */
export const KI_ORIGIN_KIND_FEATURE = 'feature';
export const KI_ORIGIN_KIND_QUERY = 'query';

export const kiOriginKindSchema = z.enum([KI_ORIGIN_KIND_FEATURE, KI_ORIGIN_KIND_QUERY]);

export type KiOriginKind = z.infer<typeof kiOriginKindSchema>;

/**
 * Encode a kind + raw id into a single string suitable for `SmlDocument.origin_id`
 * and for the attachment system's `origin` field. Format: `<kind>:<id>`.
 */
export const encodeKiOriginId = ({ kind, id }: { kind: KiOriginKind; id: string }): string =>
  `${kind}:${id}`;

/**
 * Decode an origin string produced by {@link encodeKiOriginId}.
 *
 * Tolerates ids that themselves contain `:` by splitting on the first colon only.
 * Returns `undefined` when the input is not in the expected format so callers
 * can treat unknown origins as misses without throwing.
 */
export const decodeKiOriginId = (
  origin: string
): { kind: KiOriginKind; id: string } | undefined => {
  const separator = origin.indexOf(':');
  if (separator <= 0 || separator === origin.length - 1) {
    return undefined;
  }
  const kindCandidate = origin.slice(0, separator);
  const id = origin.slice(separator + 1);
  const parsed = kiOriginKindSchema.safeParse(kindCandidate);
  if (!parsed.success) {
    return undefined;
  }
  return { kind: parsed.data, id };
};

export const kiFeatureDataSchemaV1 = z.object({
  kind: z.literal(KI_ORIGIN_KIND_FEATURE),
  feature: featureSchema,
  stream_name: z.string(),
});

export const kiQueryDataSchemaV1 = z.object({
  kind: z.literal(KI_ORIGIN_KIND_QUERY),
  query: streamQuerySchema,
  stream_name: z.string(),
  rule: z.object({
    backed: z.boolean(),
    id: z.string(),
  }),
});

/**
 * Versioned attachment payload schema. New shapes ship as `V2`, `V3`, ... so the
 * attachment registry can keep accepting older snapshots already persisted in
 * conversations.
 */
export const kiAttachmentDataSchemaV1 = z.discriminatedUnion('kind', [
  kiFeatureDataSchemaV1,
  kiQueryDataSchemaV1,
]);

export type KnowledgeIndicatorFeatureAttachmentDataV1 = z.infer<typeof kiFeatureDataSchemaV1>;
export type KnowledgeIndicatorQueryAttachmentDataV1 = z.infer<typeof kiQueryDataSchemaV1>;
export type KnowledgeIndicatorAttachmentData = z.infer<typeof kiAttachmentDataSchemaV1>;
