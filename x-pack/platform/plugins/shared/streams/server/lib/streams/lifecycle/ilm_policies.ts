/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IlmPhases as EsIlmPhases,
  IlmPhase as EsIlmPhase,
} from '@elastic/elasticsearch/lib/api/types';
import type {
  IlmPolicy,
  IlmPolicyDeletePhase,
  IlmPolicyHotPhase,
  IlmPolicyPhase,
  IlmPolicyUsage,
  PhaseName,
} from '@kbn/streams-schema';

interface IlmPolicyEntry {
  policy?: {
    phases?: EsIlmPhases;
    _meta?: Record<string, unknown>;
    deprecated?: boolean;
  };
  modified_date?: string;
  version?: number;
  in_use_by?: {
    indices?: string[];
    data_streams?: string[];
  };
}

export interface IlmPoliciesResponse {
  [policyName: string]: IlmPolicyEntry;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';

const asRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

const durationToString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (value == null) return undefined;
  return String(value);
};

type PhaseActions = Record<string, unknown>;
type IlmPolicyPhaseWithActions = IlmPolicyPhase & { actions: PhaseActions };
type IlmPolicyHotPhaseWithActions = IlmPolicyHotPhase & { actions: PhaseActions };
type IlmPolicyDeletePhaseWithActions = IlmPolicyDeletePhase & { actions: PhaseActions };

const toStreamsDownsample = (
  phaseName: Exclude<PhaseName, 'delete'>,
  phaseMinAge: string | undefined,
  actions: PhaseActions
): IlmPolicyPhase['downsample'] | undefined => {
  const downsampleAction = asRecord(actions.downsample);
  const fixedInterval = downsampleAction.fixed_interval;
  if (typeof fixedInterval !== 'string' || fixedInterval.trim() === '') {
    return undefined;
  }

  const after = phaseName === 'hot' ? '0ms' : phaseMinAge ?? '0ms';
  return { after, fixed_interval: fixedInterval };
};

const toStreamsSearchableSnapshot = (actions: PhaseActions): string | undefined => {
  const searchableSnapshotAction = asRecord(actions.searchable_snapshot);
  const repo = searchableSnapshotAction.snapshot_repository;
  return typeof repo === 'string' && repo.trim() !== '' ? repo : undefined;
};

const toStreamsHotRollover = (actions: PhaseActions): IlmPolicyHotPhase['rollover'] => {
  const rolloverAction = asRecord(actions.rollover);

  // ES can send `-1` to indicate "unset" for max_age.
  const maxAgeRaw = rolloverAction.max_age;
  const maxAge =
    typeof maxAgeRaw === 'number' && maxAgeRaw === -1 ? undefined : durationToString(maxAgeRaw);

  const rollover: IlmPolicyHotPhase['rollover'] = {};

  const maxSize = rolloverAction.max_size;
  if (typeof maxSize === 'string' || typeof maxSize === 'number') {
    rollover.max_size = maxSize;
  }

  const maxPrimaryShardSize = rolloverAction.max_primary_shard_size;
  if (typeof maxPrimaryShardSize === 'string' || typeof maxPrimaryShardSize === 'number') {
    rollover.max_primary_shard_size = maxPrimaryShardSize;
  }

  if (maxAge != null) rollover.max_age = maxAge;

  const maxDocs = rolloverAction.max_docs;
  if (typeof maxDocs === 'number') {
    rollover.max_docs = maxDocs;
  }

  const maxPrimaryShardDocs = rolloverAction.max_primary_shard_docs;
  if (typeof maxPrimaryShardDocs === 'number') {
    rollover.max_primary_shard_docs = maxPrimaryShardDocs;
  }

  return rollover;
};

function toStreamsNonDeletePhase(
  phaseName: 'hot',
  phase: EsIlmPhase | undefined
): IlmPolicyHotPhaseWithActions | undefined;
function toStreamsNonDeletePhase(
  phaseName: Exclude<PhaseName, 'delete' | 'hot'>,
  phase: EsIlmPhase | undefined
): IlmPolicyPhaseWithActions | undefined;
function toStreamsNonDeletePhase(
  phaseName: Exclude<PhaseName, 'delete'>,
  phase: EsIlmPhase | undefined
): IlmPolicyHotPhaseWithActions | IlmPolicyPhaseWithActions | undefined {
  if (!phase) return undefined;

  const actions = { ...asRecord(phase.actions) };
  const minAge = durationToString(phase.min_age);

  const readonlyEnabled = Object.prototype.hasOwnProperty.call(actions, 'readonly');
  const searchableSnapshot = toStreamsSearchableSnapshot(actions);
  const downsample = toStreamsDownsample(phaseName, minAge, actions);

  const base = {
    name: phaseName,
    size_in_bytes: 0,
    ...(minAge ? { min_age: minAge } : {}),
    ...(downsample ? { downsample } : {}),
    ...(readonlyEnabled ? { readonly: true } : {}),
    ...(searchableSnapshot ? { searchable_snapshot: searchableSnapshot } : {}),
    actions,
  };

  if (phaseName === 'hot') {
    return {
      ...base,
      name: 'hot',
      rollover: toStreamsHotRollover(actions),
    };
  }

  return base;
}

const toStreamsDeletePhase = (
  phase: EsIlmPhase | undefined
): IlmPolicyDeletePhaseWithActions | undefined => {
  if (!phase) return undefined;

  const actions = { ...asRecord(phase.actions) };
  const minAge = durationToString(phase.min_age) ?? '';
  const deleteAction = asRecord(actions.delete);
  const deleteSearchableSnapshot = deleteAction.delete_searchable_snapshot;

  return {
    name: 'delete',
    min_age: minAge,
    ...(typeof deleteSearchableSnapshot === 'boolean'
      ? { delete_searchable_snapshot: deleteSearchableSnapshot }
      : {}),
    actions,
  };
};

export const buildPolicyUsage = (
  policyEntry: IlmPolicyEntry,
  dataStreamByBackingIndices: Record<string, string> = {}
): IlmPolicyUsage => {
  const inUseIndices = policyEntry.in_use_by?.indices ?? [];
  const indices = inUseIndices.filter((indexName) => !dataStreamByBackingIndices[indexName]);
  const explicitDataStreams = policyEntry.in_use_by?.data_streams ?? [];
  const derivedDataStreams = inUseIndices
    .map((indexName) => dataStreamByBackingIndices[indexName])
    .filter((value): value is string => Boolean(value));
  const dataStreams = Array.from(new Set([...explicitDataStreams, ...derivedDataStreams]));

  return { in_use_by: { data_streams: dataStreams, indices } };
};

export const normalizeIlmPhases = (phases?: EsIlmPhases): IlmPolicy['phases'] => {
  if (!phases) {
    return {};
  }

  const hotPhase = toStreamsNonDeletePhase('hot', phases.hot);
  const warmPhase = toStreamsNonDeletePhase('warm', phases.warm);
  const coldPhase = toStreamsNonDeletePhase('cold', phases.cold);
  const frozenPhase = toStreamsNonDeletePhase('frozen', phases.frozen);
  const deletePhase = toStreamsDeletePhase(phases.delete);

  // Keep output stable: omit missing phases entirely.
  const normalized: IlmPolicy['phases'] = {};
  if (hotPhase) normalized.hot = hotPhase;
  if (warmPhase) normalized.warm = warmPhase;
  if (coldPhase) normalized.cold = coldPhase;
  if (frozenPhase) normalized.frozen = frozenPhase;
  if (deletePhase) normalized.delete = deletePhase;

  return normalized;
};
