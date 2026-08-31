/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import { RULE_TEMPLATE_SOURCE_TYPE } from '@kbn/alerting-v2-constants';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../common/saved_object_types';

const SOURCE_REF_PREFIX = 'source:';

interface SourceReferenceDescriptor {
  field: string;
  savedObjectType: string;
}

const SOURCE_REFERENCE_DESCRIPTORS: Record<string, SourceReferenceDescriptor[]> = {
  [RULE_TEMPLATE_SOURCE_TYPE]: [
    { field: 'template_id', savedObjectType: RULE_TEMPLATE_SAVED_OBJECT_TYPE },
  ],
};

interface SourceLike {
  type: string;
  data: Record<string, unknown>;
}

function buildSourceRefName(field: string): string {
  return `${SOURCE_REF_PREFIX}${field}`;
}

function isSourceReference(ref: SavedObjectReference): boolean {
  return ref.name.startsWith(SOURCE_REF_PREFIX);
}

function getDescriptors(sourceType: string): SourceReferenceDescriptor[] | undefined {
  return SOURCE_REFERENCE_DESCRIPTORS[sourceType];
}

/**
 * Extracts SO references from `metadata.source.data` fields declared in
 * SOURCE_REFERENCE_DESCRIPTORS. Returns an empty array when source is absent
 * or has no registered descriptors.
 */
export function extractSourceReferences(source: SourceLike | undefined): SavedObjectReference[] {
  if (!source) {
    return [];
  }

  const descriptors = getDescriptors(source.type);
  if (!descriptors?.length) {
    return [];
  }

  const references: SavedObjectReference[] = [];
  for (const descriptor of descriptors) {
    const value = source.data[descriptor.field];
    if (typeof value === 'string' && value.length > 0) {
      references.push({
        name: buildSourceRefName(descriptor.field),
        type: descriptor.savedObjectType,
        id: value,
      });
    }
  }
  return references;
}

/**
 * Rebuilds the full `references[]` for a rule write:
 * - regenerates `source:*` refs from the current source
 * - preserves all non-`source:` refs (including `artifact:*`)
 */
export function rebuildSourceReferences({
  source,
  previousReferences,
}: {
  source: SourceLike | undefined;
  previousReferences: SavedObjectReference[] | undefined;
}): SavedObjectReference[] {
  const nonSourceRefs = (previousReferences ?? []).filter((ref) => !isSourceReference(ref));
  const nextSourceRefs = extractSourceReferences(source);
  return [...nonSourceRefs, ...nextSourceRefs];
}

/**
 * Overwrites registered reference fields in `source.data` with the live id
 * from `references[]` (so import remapping is reflected in API responses).
 * Returns a new source object; does not mutate the input.
 */
export function injectSourceReferences(
  source: SourceLike | undefined,
  references: SavedObjectReference[] | undefined
): SourceLike | undefined {
  if (!source) {
    return source;
  }

  const descriptors = getDescriptors(source.type);
  if (!descriptors?.length || !references?.length) {
    return source;
  }

  const refsByName = new Map(references.map((ref) => [ref.name, ref]));
  const data = { ...source.data };

  for (const descriptor of descriptors) {
    const ref = refsByName.get(buildSourceRefName(descriptor.field));
    if (ref) {
      data[descriptor.field] = ref.id;
    }
  }

  return { ...source, data };
}
