/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { ArtifactTypeRegistry } from './artifact_type_registry';
import type { RuleArtifactLike } from './types';

const ARTIFACT_REF_NAMESPACE = 'artifact';

/**
 * Builds the framework-owned reference name for an artifact field.
 * Format: `artifact:<field>:<artifactId>` — field first (no colons), artifact id last.
 */
export function buildArtifactReferenceName(field: string, artifactId: string): string {
  return `${ARTIFACT_REF_NAMESPACE}:${field}:${artifactId}`;
}

/**
 * Parses an artifact reference name. Returns undefined when the name is not
 * an `artifact:`-prefixed reference.
 */
export function parseArtifactReferenceName(
  name: string
): { field: string; artifactId: string } | undefined {
  const [prefix, field, ...idParts] = name.split(':');
  const artifactId = idParts.join(':');
  if (prefix !== ARTIFACT_REF_NAMESPACE || !field || !artifactId) {
    return undefined;
  }
  return { field, artifactId };
}

function isArtifactReference(ref: SavedObjectReference): boolean {
  return parseArtifactReferenceName(ref.name) !== undefined;
}

/**
 * Extracts SO references for registered artifacts from their `data` fields.
 * Leaves `data` unchanged (raw ids stay in attributes).
 */
export function extractArtifactReferences(
  artifacts: RuleArtifactLike[] | undefined,
  registry: ArtifactTypeRegistry
): SavedObjectReference[] {
  if (!artifacts?.length) {
    return [];
  }

  const references: SavedObjectReference[] = [];
  for (const artifact of artifacts) {
    const def = registry.get(artifact.type);
    if (!def?.references?.length) {
      continue;
    }

    for (const descriptor of def.references) {
      const value = artifact.data[descriptor.field];
      if (typeof value !== 'string' || value.length === 0) {
        continue;
      }
      references.push({
        name: buildArtifactReferenceName(descriptor.field, artifact.id),
        type: descriptor.savedObjectType,
        id: value,
      });
    }
  }
  return references;
}

/**
 * Rebuilds the full `references[]` for a rule write:
 * - regenerates refs for registered artifacts in the new array
 * - carries over `artifact:*` refs for unregistered artifacts still present
 * - drops `artifact:*` refs whose artifact id is gone
 * - preserves all non-artifact references
 */
export function rebuildArtifactReferences({
  artifacts,
  previousReferences,
  registry,
}: {
  artifacts: RuleArtifactLike[] | undefined;
  previousReferences: SavedObjectReference[] | undefined;
  registry: ArtifactTypeRegistry;
}): SavedObjectReference[] {
  const nextArtifacts = artifacts ?? [];
  const artifactIds = new Set(nextArtifacts.map((artifact) => artifact.id));
  const previous = previousReferences ?? [];

  const nonArtifactRefs = previous.filter((ref) => !isArtifactReference(ref));

  const registeredRefs = extractArtifactReferences(nextArtifacts, registry);

  const unregisteredCarryOver = previous.filter((ref) => {
    const parsed = parseArtifactReferenceName(ref.name);
    if (!parsed) {
      return false;
    }
    if (!artifactIds.has(parsed.artifactId)) {
      return false;
    }
    const artifact = nextArtifacts.find((item) => item.id === parsed.artifactId);
    if (!artifact) {
      return false;
    }
    // Only carry over when the type is unregistered (registered ones are regenerated).
    return registry.get(artifact.type) === undefined;
  });

  return [...nonArtifactRefs, ...registeredRefs, ...unregisteredCarryOver];
}

/**
 * Overwrites registered reference fields in `data` with the live id from
 * `references[]` (so import remapping is reflected in the API response).
 * Returns a new array; does not mutate the input.
 */
export function injectArtifactReferences(
  artifacts: RuleArtifactLike[] | undefined,
  references: SavedObjectReference[] | undefined,
  registry: ArtifactTypeRegistry
): RuleArtifactLike[] | undefined {
  if (!artifacts) {
    return artifacts;
  }
  if (!artifacts.length || !references?.length) {
    return artifacts.map((artifact) => ({ ...artifact, data: { ...artifact.data } }));
  }

  const refsByName = new Map(references.map((ref) => [ref.name, ref]));

  return artifacts.map((artifact) => {
    const def = registry.get(artifact.type);
    if (!def?.references?.length) {
      return { ...artifact, data: { ...artifact.data } };
    }

    const data = { ...artifact.data };
    for (const descriptor of def.references) {
      const name = buildArtifactReferenceName(descriptor.field, artifact.id);
      const ref = refsByName.get(name);
      if (ref) {
        data[descriptor.field] = ref.id;
      }
    }
    return { ...artifact, data };
  });
}
