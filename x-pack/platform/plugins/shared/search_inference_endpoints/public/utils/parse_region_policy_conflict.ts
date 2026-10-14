/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRegionPolicyConflictAttributes } from '../../common/type_guards';
import type { RegionPolicyConflictRef } from '../../common/types';
import type { RegionPolicyConflictArtifact, RegionPolicyConflictArtifactType } from '../types';

interface ParsedConflictRef {
  type: RegionPolicyConflictArtifactType;
  name: string;
  endpointId: string;
}

export const parseRegionPolicyConflict = (
  attributes: unknown
): RegionPolicyConflictArtifact[] | undefined => {
  if (!isRegionPolicyConflictAttributes(attributes)) return undefined;

  const deniedEndpointIds = toStringArray(attributes.denied_endpoint_ids);
  if (deniedEndpointIds.length === 0) return undefined;

  const artifacts = groupByArtifact([
    ...parseRefs(attributes.referencing_indexes, 'index', deniedEndpointIds),
    ...parseRefs(attributes.referencing_pipelines, 'pipeline', deniedEndpointIds),
  ]);

  if (artifacts.length === 0) return undefined;
  return artifacts;
};

const parseRefs = (
  refs: RegionPolicyConflictRef | undefined,
  type: RegionPolicyConflictArtifactType,
  deniedEndpointIds: string[]
): ParsedConflictRef[] => {
  return toStringArray(refs).flatMap((ref) => {
    const parsed = splitEndpointAndName(ref, deniedEndpointIds);
    if (!parsed) return [];
    return [{ type, ...parsed }];
  });
};

const splitEndpointAndName = (
  ref: string,
  deniedEndpointIds: string[]
): { endpointId: string; name: string } | undefined => {
  const endpointId = findLongestDeniedPrefix(ref, deniedEndpointIds);
  if (!endpointId) return undefined;

  const name = ref.slice(endpointId.length + 1);
  if (name.length === 0) return undefined;

  return { endpointId, name };
};

const findLongestDeniedPrefix = (ref: string, deniedEndpointIds: string[]): string | undefined => {
  const matches = deniedEndpointIds.filter((endpointId) => ref.startsWith(`${endpointId}:`));
  if (matches.length === 0) return undefined;

  return matches.reduce((longest, endpointId) =>
    endpointId.length > longest.length ? endpointId : longest
  );
};

const groupByArtifact = (refs: ParsedConflictRef[]): RegionPolicyConflictArtifact[] => {
  const artifactsByKey = new Map<string, RegionPolicyConflictArtifact>();

  for (const { type, name, endpointId } of refs) {
    const key = `${type}:${name}`;
    const existing = artifactsByKey.get(key);

    if (!existing) {
      artifactsByKey.set(key, { type, name, endpointIds: [endpointId] });
      continue;
    }

    const isNewEndpoint = !existing.endpointIds.includes(endpointId);
    if (isNewEndpoint) {
      existing.endpointIds.push(endpointId);
    }
  }

  return [...artifactsByKey.values()];
};

const toStringArray = (value: RegionPolicyConflictRef | undefined): string[] => {
  if (value === undefined) return [];
  if (typeof value === 'string') return [value];
  return value;
};
