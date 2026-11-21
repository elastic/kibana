/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import type {
  FindRecordsRequest,
  InvestigationPriority,
  InvestigationStatus,
  Verdict,
} from '../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;
export const DEFAULT_SORT_FIELD = 'updated_at';
export const BUSINESS_UNIT_FIELD_KEY = 'business_unit_keyword';

export interface QueueState {
  search: string;
  status: InvestigationStatus[];
  priority: InvestigationPriority[];
  investigationType: string[];
  verdict: Verdict[];
  /** A username, or `unassigned`. */
  owner: string | undefined;
  businessUnit: string | undefined;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  /** Zero based. */
  pageIndex: number;
  pageSize: number;
}

export const DEFAULT_QUEUE_STATE: QueueState = {
  search: '',
  status: [],
  priority: [],
  investigationType: [],
  verdict: [],
  owner: undefined,
  businessUnit: undefined,
  sortField: DEFAULT_SORT_FIELD,
  sortOrder: 'desc',
  pageIndex: 0,
  pageSize: DEFAULT_PAGE_SIZE,
};

const STATUSES: readonly InvestigationStatus[] = ['open', 'in-progress', 'closed'];
const PRIORITIES: readonly InvestigationPriority[] = ['low', 'medium', 'high', 'critical'];
const VERDICTS: readonly Verdict[] = ['true_positive', 'benign', 'inconclusive'];

/** Fields the server accepts for sorting. Other values in the URL fall back to the default. */
export const SORTABLE_FIELDS: readonly string[] = [
  'display_num',
  'title.keyword',
  'priority',
  'status',
  'investigation_type',
  'updated_at',
  'created_at',
  'counters.alerts',
  'counters.evidence',
  `fields.${BUSINESS_UNIT_FIELD_KEY}`,
];

const pickAllowed = <T extends string>(values: string[], allowed: readonly T[]): T[] =>
  allowed.filter((candidate) => values.includes(candidate));

export const parseQueueState = (search: string): QueueState => {
  const params = new URLSearchParams(search);
  const sortField = params.get('sort') ?? '';
  const pageSize = Number(params.get('size'));
  const page = Number(params.get('page'));

  return {
    search: params.get('q') ?? '',
    status: pickAllowed(params.getAll('status'), STATUSES),
    priority: pickAllowed(params.getAll('priority'), PRIORITIES),
    investigationType: params.getAll('type'),
    verdict: pickAllowed(params.getAll('verdict'), VERDICTS),
    owner: params.get('owner') ?? undefined,
    businessUnit: params.get('unit') ?? undefined,
    sortField: SORTABLE_FIELDS.includes(sortField) ? sortField : DEFAULT_SORT_FIELD,
    sortOrder: params.get('dir') === 'asc' ? 'asc' : 'desc',
    pageIndex: Number.isInteger(page) && page > 1 ? page - 1 : 0,
    pageSize: PAGE_SIZE_OPTIONS.some((option) => option === pageSize)
      ? pageSize
      : DEFAULT_PAGE_SIZE,
  };
};

/** Writes only the values that differ from the defaults, so a clean URL means a clean queue. */
export const serializeQueueState = (state: QueueState): string => {
  const params = new URLSearchParams();
  if (state.search) params.set('q', state.search);
  state.status.forEach((value) => params.append('status', value));
  state.priority.forEach((value) => params.append('priority', value));
  state.investigationType.forEach((value) => params.append('type', value));
  state.verdict.forEach((value) => params.append('verdict', value));
  if (state.owner) params.set('owner', state.owner);
  if (state.businessUnit) params.set('unit', state.businessUnit);
  if (state.sortField !== DEFAULT_SORT_FIELD || state.sortOrder !== 'desc') {
    params.set('sort', state.sortField);
    params.set('dir', state.sortOrder);
  }
  if (state.pageIndex > 0) params.set('page', String(state.pageIndex + 1));
  if (state.pageSize !== DEFAULT_PAGE_SIZE) params.set('size', String(state.pageSize));
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const toFindRequest = (state: QueueState): FindRecordsRequest => ({
  search: state.search.trim() || undefined,
  status: state.status.length ? state.status : undefined,
  priority: state.priority.length ? state.priority : undefined,
  investigation_type: state.investigationType.length ? state.investigationType : undefined,
  verdict: state.verdict.length ? state.verdict : undefined,
  owner: state.owner,
  field: state.businessUnit ? [`${BUSINESS_UNIT_FIELD_KEY}:${state.businessUnit}`] : undefined,
  sort_field: state.sortField,
  sort_order: state.sortOrder,
  page: state.pageIndex + 1,
  per_page: Math.min(state.pageSize, INVESTIGATION_LIMITS.maxPerPage),
});

export const hasActiveFilters = (state: QueueState): boolean =>
  state.search.trim().length > 0 ||
  state.status.length > 0 ||
  state.priority.length > 0 ||
  state.investigationType.length > 0 ||
  state.verdict.length > 0 ||
  state.owner !== undefined ||
  state.businessUnit !== undefined;

export interface UseQueueUrlState {
  state: QueueState;
  /** Merges a change into the state. Changing anything but the page goes back to page one. */
  update: (change: Partial<QueueState>) => void;
  clearFilters: () => void;
}

/** The queue's filters, sort and page, kept in the URL query so a reload restores them. */
export const useQueueUrlState = (): UseQueueUrlState => {
  const history = useHistory();
  const { search } = useLocation();
  const state = useMemo(() => parseQueueState(search), [search]);

  const update = useCallback(
    (change: Partial<QueueState>) => {
      const next: QueueState = {
        ...state,
        pageIndex: 'pageIndex' in change ? state.pageIndex : 0,
        ...change,
      };
      history.replace({ pathname: history.location.pathname, search: serializeQueueState(next) });
    },
    [history, state]
  );

  const clearFilters = useCallback(() => {
    history.replace({
      pathname: history.location.pathname,
      search: serializeQueueState({
        ...DEFAULT_QUEUE_STATE,
        sortField: state.sortField,
        sortOrder: state.sortOrder,
        pageSize: state.pageSize,
      }),
    });
  }, [history, state.pageSize, state.sortField, state.sortOrder]);

  return { state, update, clearFilters };
};
