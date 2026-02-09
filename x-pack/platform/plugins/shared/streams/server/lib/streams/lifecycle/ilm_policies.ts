/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicy, IlmPolicyPhases, IlmPolicyUsage, PhaseName } from '@kbn/streams-schema';

interface IlmPolicyEntry {
  policy?: {
    phases?: IlmPolicyPhases;
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

export const buildPolicyUsage = (policyEntry: IlmPolicyEntry): IlmPolicyUsage => {
  const inUseIndices = policyEntry.in_use_by?.indices ?? [];
  const indices = inUseIndices.filter((indexName) => !indexName.startsWith('.ds-'));
  const explicitDataStreams = policyEntry.in_use_by?.data_streams ?? [];
  const derivedDataStreams = inUseIndices
    .map((indexName) => getDataStreamFromBackingIndex(indexName))
    .filter((value): value is string => Boolean(value));
  const dataStreams = Array.from(new Set([...explicitDataStreams, ...derivedDataStreams]));

  return { in_use_by: { dataStreams, indices } };
};

const getDataStreamFromBackingIndex = (indexName: string) => {
  if (!indexName.startsWith('.ds-')) {
    return undefined;
  }

  const withoutPrefix = indexName.slice(4);
  const parts = withoutPrefix.split('-');
  if (parts.length < 3) {
    return undefined;
  }

  return parts.slice(0, -2).join('-');
};

export const normalizeIlmPhases = (esPhases?: Record<string, any>): IlmPolicy['phases'] => {
  if (!esPhases) {
    return {};
  }

  const out: IlmPolicyPhases = {};
  const phaseNames: PhaseName[] = ['hot', 'warm', 'cold', 'frozen', 'delete'];

  for (const phaseName of phaseNames) {
    const esPhase = esPhases[phaseName];
    if (!esPhase) continue;

    if (phaseName === 'delete') {
      out.delete = {
        name: 'delete',
        min_age: esPhase.min_age ?? '0ms',
        delete_searchable_snapshot: esPhase.actions?.delete?.delete_searchable_snapshot ?? true,
      };
      continue;
    }

    // Flatten nested actions into top-level properties
    const actions = esPhase.actions ?? {};
    out[phaseName] = {
      name: phaseName,
      min_age: esPhase.min_age,
      downsample: actions.downsample?.fixed_interval
        ? {
            after: esPhase.min_age ?? '0ms',
            fixed_interval: actions.downsample.fixed_interval,
          }
        : undefined,
      readonly: actions.readonly !== undefined || undefined,
      searchable_snapshot: actions.searchable_snapshot?.snapshot_repository,
      rollover: actions.rollover,
    } as any;
  }

  return out;
};

export const denormalizeIlmPhases = (uiPhases: IlmPolicyPhases): Record<string, any> => {
  const out: Record<string, any> = {};
  const phaseNames: PhaseName[] = ['hot', 'warm', 'cold', 'frozen', 'delete'];

  for (const phaseName of phaseNames) {
    const uiPhase = (uiPhases as any)[phaseName];
    if (!uiPhase) continue;

    if (phaseName === 'delete') {
      out.delete = {
        min_age: uiPhase.min_age,
        actions: {
          delete: {
            delete_searchable_snapshot:
              uiPhase.delete_searchable_snapshot == null
                ? true
                : Boolean(uiPhase.delete_searchable_snapshot),
          },
        },
      };
      continue;
    }

    // Build actions object from flattened properties
    const actions: Record<string, any> = {};

    if (phaseName === 'hot' && uiPhase.rollover) {
      actions.rollover = uiPhase.rollover;
    }

    if (uiPhase.readonly) {
      actions.readonly = {};
    }

    if (uiPhase.downsample?.fixed_interval) {
      actions.downsample = { fixed_interval: uiPhase.downsample.fixed_interval };
    }

    if ((phaseName === 'cold' || phaseName === 'frozen') && uiPhase.searchable_snapshot) {
      actions.searchable_snapshot = { snapshot_repository: uiPhase.searchable_snapshot };
    }

    const esPhase: Record<string, any> = {};
    if (uiPhase.min_age) {
      esPhase.min_age = uiPhase.min_age;
    }
    if (Object.keys(actions).length > 0) {
      esPhase.actions = actions;
    }

    out[phaseName] = esPhase;
  }

  return out;
};
