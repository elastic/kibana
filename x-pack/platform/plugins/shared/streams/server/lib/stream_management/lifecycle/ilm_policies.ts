/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IlmPolicy,
  IlmPolicyPhase,
  IlmPolicyPhases,
  IlmPolicyUsage,
} from '@kbn/streams-schema';

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

export const normalizeIlmPhases = (phases?: IlmPolicyPhases): IlmPolicy['phases'] => {
  if (!phases) {
    return {};
  }

  const entries = Object.entries(phases) as Array<[string, IlmPolicyPhase]>;
  return Object.fromEntries(
    entries.filter(([, phase]) => phase !== undefined)
  ) as IlmPolicy['phases'];
};
