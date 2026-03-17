/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/streams-schema';
import { createHash } from 'crypto';

export const CANONICAL_LAST_SEEN = '2026-01-01T00:00:00.000Z';

const normalizeIdPart = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const parseBracketList = (raw: string): string[] =>
  raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\([^)]*\)/g, '').trim())
    .filter((s) => s.length > 0)
    .filter((s) => !s.includes('...'))
    .filter((s) => !s.toLowerCase().includes('multiple services'));

const parseGroundTruthBlocks = (expectedGroundTruth: string): Record<string, string[]> => {
  const blocks: Record<string, string[]> = {};
  const re = /([a-zA-Z_]+)\s*=\s*\[([^\]]*)\]/g;
  for (const match of expectedGroundTruth.matchAll(re)) {
    const key = match[1];
    const list = match[2];
    if (!key || list == null) continue;
    blocks[key] = parseBracketList(list);
  }
  return blocks;
};

const makeDeterministicFeatureUuid = (scenarioId: string, id: string): string => {
  const digest = createHash('sha256')
    .update(`canonical:${normalizeIdPart(scenarioId)}:${normalizeIdPart(id)}`)
    .digest('hex');
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-a${digest.slice(
    17,
    20
  )}-${digest.slice(20, 32)}`;
};

const makeFeature = ({
  streamName,
  scenarioId,
  id,
  type,
  title,
  description,
  properties,
}: {
  streamName: string;
  scenarioId: string;
  id: string;
  type: string;
  title?: string;
  description: string;
  properties: Record<string, unknown>;
}): Feature => ({
  id,
  uuid: makeDeterministicFeatureUuid(scenarioId, id),
  status: 'active',
  last_seen: CANONICAL_LAST_SEEN,
  stream_name: streamName,
  type,
  title,
  description,
  properties,
  confidence: 100,
});

/**
 * Builds a deterministic "canonical" feature set from the dataset's
 * `expected_ground_truth` string (e.g. `entities=[...], deps=[...], infra=[...]`).
 *
 * This is intended to decouple query-generation evals from snapshot-extracted
 * features so query-generation regressions can be distinguished from feature
 * identification regressions.
 */
export const canonicalFeaturesFromExpectedGroundTruth = ({
  streamName,
  scenarioId,
  expectedGroundTruth,
}: {
  streamName: string;
  scenarioId: string;
  expectedGroundTruth: string;
}): Feature[] => {
  const blocks = parseGroundTruthBlocks(expectedGroundTruth);

  const { entities = [], deps = [], infra = [] } = blocks;

  const features: Feature[] = [];

  for (const entity of entities) {
    const name = entity.trim();
    const id = `entity-${normalizeIdPart(name)}`;
    features.push(
      makeFeature({
        streamName,
        scenarioId,
        id,
        type: 'entity',
        title: name,
        description: `Service/entity: ${name}`,
        properties: { name },
      })
    );
  }

  for (const dep of deps) {
    const arrowIdx = dep.indexOf('->');
    if (arrowIdx === -1) continue;
    const from = dep.slice(0, arrowIdx).trim();
    const to =
      dep
        .slice(arrowIdx + 2)
        .trim()
        .split(/\s+/)[0] ?? '';
    if (!from || !to) continue;

    const id = `dep-${normalizeIdPart(from)}-${normalizeIdPart(to)}`;
    features.push(
      makeFeature({
        streamName,
        scenarioId,
        id,
        type: 'dependency',
        title: `${from} → ${to}`,
        description: `Dependency: ${from} → ${to}`,
        properties: { from, to },
      })
    );
  }

  for (const item of infra) {
    const name = item.trim();
    const id = `infra-${normalizeIdPart(name)}`;
    features.push(
      makeFeature({
        streamName,
        scenarioId,
        id,
        type: 'infrastructure',
        title: name,
        description: `Infrastructure: ${name}`,
        properties: { name },
      })
    );
  }

  return features;
};
