/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';

import { buildCompositionJsonSchema } from '@elastic/isomer-sdk';
import type { KibanaIsomerRuntime } from '@kbn/isomer';

/** Keys that describe a schema to a reader rather than constrain a document. */
const PROSE_KEYS = new Set(['description', 'title', 'examples', 'markdownDescription']);

const normalise = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalise);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as object)
        .filter((key) => !PROSE_KEYS.has(key))
        .sort()
        .map((key) => [key, normalise((value as Record<string, unknown>)[key])])
    );
  }
  return value;
};

const digest = (value: unknown): string =>
  createHash('sha256')
    .update(JSON.stringify(normalise(value)))
    .digest('hex')
    .slice(0, 16);

export interface PackVocabulary {
  primitives: string[];
  /** A digest of the pack's composed JSON Schema with its prose stripped. */
  vocabulary: string;
}

export interface RuntimeVocabulary {
  packs: Record<string, PackVocabulary>;
  /** One digest over every pack's, in pack order. */
  vocabulary: string;
}

/**
 * What two runtimes compare before one sends the other a composition: a digest per pack of the schema its
 * primitives validate against, and one over all of them. Two runtimes with the same digest accept the same
 * compositions. It stands in for the versioned snapshots and `packs` stamp of elastic/isomer#201, and it
 * says nothing about how a primitive draws.
 */
export const describeVocabulary = ({
  packs,
}: Pick<KibanaIsomerRuntime, 'packs'>): RuntimeVocabulary => {
  const described: Record<string, PackVocabulary> = {};
  for (const pack of packs) {
    described[pack.id] = {
      primitives: pack.primitives.map(({ type }) => type),
      // Inlined, so the digest reads what the schema accepts and not how its objects happen to be shared.
      vocabulary: digest(buildCompositionJsonSchema(pack.primitives, { reused: 'inline' })),
    };
  }
  return {
    packs: described,
    vocabulary: digest(Object.entries(described).map(([id, { vocabulary }]) => [id, vocabulary])),
  };
};
