/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { EvidenceItem, InvestigationItem } from '../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { useItems } from '../../hooks';

const isEvidence = (item: InvestigationItem): item is EvidenceItem => item.kind === 'evidence';

const toSortedUnique = (values: readonly string[]): string[] =>
  Array.from(new Set(values.filter((value) => value.length > 0))).sort();

export interface EvidenceLookup {
  byId: ReadonlyMap<string, EvidenceItem>;
  byRef: ReadonlyMap<string, EvidenceItem>;
  isLoading: boolean;
}

const useEvidenceLookup = (
  recordId: string,
  filter: { refs: string[] } | { ids: string[] }
): EvidenceLookup => {
  const hasValues = ('refs' in filter ? filter.refs : filter.ids).length > 0;
  const { data, isLoading } = useItems(
    recordId,
    {
      ...filter,
      kind: ['evidence'],
      per_page: INVESTIGATION_LIMITS.maxPerPage,
    },
    { enabled: hasValues }
  );

  return useMemo(() => {
    const items = hasValues ? (data?.items ?? []).filter(isEvidence) : [];
    return {
      byId: new Map(items.map((item) => [item.id, item])),
      byRef: new Map(items.map((item) => [item.ref, item])),
      isLoading: hasValues && isLoading,
    };
  }, [data, hasValues, isLoading]);
};

/** Resolves evidence refs (E12) to items with one request. At most 100 refs are resolved. */
export const useEvidenceByRefs = (recordId: string, refs: readonly string[]): EvidenceLookup => {
  const key = toSortedUnique(refs).slice(0, INVESTIGATION_LIMITS.maxPerPage).join('\u0000');
  const stableRefs = useMemo(() => (key.length > 0 ? key.split('\u0000') : []), [key]);
  return useEvidenceLookup(recordId, { refs: stableRefs });
};

/** Resolves evidence item ids to items with one request. At most 100 ids are resolved. */
export const useEvidenceByIds = (recordId: string, ids: readonly string[]): EvidenceLookup => {
  const key = toSortedUnique(ids).slice(0, INVESTIGATION_LIMITS.maxPerPage).join('\u0000');
  const stableIds = useMemo(() => (key.length > 0 ? key.split('\u0000') : []), [key]);
  return useEvidenceLookup(recordId, { ids: stableIds });
};
