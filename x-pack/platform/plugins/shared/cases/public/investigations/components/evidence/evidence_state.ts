/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import {
  EVIDENCE_TYPE_LABELS,
  INDICATOR_TYPE_LABELS,
} from '../../../../common/investigations/types';
import type {
  EvidenceType,
  FindItemsRequest,
  IndicatorType,
} from '../../../../common/investigations/types';

export const EVIDENCE_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const DEFAULT_EVIDENCE_PAGE_SIZE = 50;

/** UI column field to the sort field the server accepts. */
export const EVIDENCE_SORT_FIELDS = {
  ref: 'ref_num',
  title: 'title',
  type: 'evidence.type',
  created_by: 'created_by',
  created_at: 'created_at',
} as const;

export type EvidenceSortKey = keyof typeof EVIDENCE_SORT_FIELDS;

export interface EvidenceState {
  search: string;
  types: EvidenceType[];
  indicatorTypes: IndicatorType[];
  /** Actor ids. */
  addedBy: string[];
  sinceHandoff: boolean;
  sortKey: EvidenceSortKey;
  sortOrder: 'asc' | 'desc';
  /** Zero based. */
  pageIndex: number;
  pageSize: number;
}

export const DEFAULT_EVIDENCE_STATE: EvidenceState = {
  search: '',
  types: [],
  indicatorTypes: [],
  addedBy: [],
  sinceHandoff: false,
  sortKey: 'ref',
  sortOrder: 'asc',
  pageIndex: 0,
  pageSize: DEFAULT_EVIDENCE_PAGE_SIZE,
};

const PARAM = {
  search: 'ev_q',
  type: 'ev_type',
  indicatorType: 'ev_itype',
  addedBy: 'ev_by',
  sinceHandoff: 'ev_new',
  sort: 'ev_sort',
  dir: 'ev_dir',
  page: 'ev_page',
  size: 'ev_size',
  item: 'item',
} as const;

const OWNED_PARAMS: readonly string[] = [
  PARAM.search,
  PARAM.type,
  PARAM.indicatorType,
  PARAM.addedBy,
  PARAM.sinceHandoff,
  PARAM.sort,
  PARAM.dir,
  PARAM.page,
  PARAM.size,
];

const isEvidenceType = (value: string): value is EvidenceType =>
  Object.prototype.hasOwnProperty.call(EVIDENCE_TYPE_LABELS, value);

const isIndicatorType = (value: string): value is IndicatorType =>
  Object.prototype.hasOwnProperty.call(INDICATOR_TYPE_LABELS, value);

const isSortKey = (value: string): value is EvidenceSortKey =>
  Object.prototype.hasOwnProperty.call(EVIDENCE_SORT_FIELDS, value);

export const parseEvidenceState = (search: string): EvidenceState => {
  const params = new URLSearchParams(search);
  const sort = params.get(PARAM.sort) ?? '';
  const size = Number(params.get(PARAM.size));
  const page = Number(params.get(PARAM.page));

  return {
    search: params.get(PARAM.search) ?? '',
    types: params.getAll(PARAM.type).filter(isEvidenceType),
    indicatorTypes: params.getAll(PARAM.indicatorType).filter(isIndicatorType),
    addedBy: params.getAll(PARAM.addedBy),
    sinceHandoff: params.get(PARAM.sinceHandoff) === '1',
    sortKey: isSortKey(sort) ? sort : DEFAULT_EVIDENCE_STATE.sortKey,
    sortOrder:
      params.get(PARAM.dir) === 'desc'
        ? 'desc'
        : params.get(PARAM.dir) === 'asc'
        ? 'asc'
        : DEFAULT_EVIDENCE_STATE.sortOrder,
    pageIndex: Number.isInteger(page) && page > 1 ? page - 1 : 0,
    pageSize: EVIDENCE_PAGE_SIZE_OPTIONS.some((option) => option === size)
      ? size
      : DEFAULT_EVIDENCE_PAGE_SIZE,
  };
};

/** Writes the evidence parameters that differ from the defaults into `params`. */
const writeEvidenceState = (params: URLSearchParams, state: EvidenceState): void => {
  OWNED_PARAMS.forEach((key) => params.delete(key));
  if (state.search) params.set(PARAM.search, state.search);
  state.types.forEach((value) => params.append(PARAM.type, value));
  state.indicatorTypes.forEach((value) => params.append(PARAM.indicatorType, value));
  state.addedBy.forEach((value) => params.append(PARAM.addedBy, value));
  if (state.sinceHandoff) params.set(PARAM.sinceHandoff, '1');
  if (
    state.sortKey !== DEFAULT_EVIDENCE_STATE.sortKey ||
    state.sortOrder !== DEFAULT_EVIDENCE_STATE.sortOrder
  ) {
    params.set(PARAM.sort, state.sortKey);
    params.set(PARAM.dir, state.sortOrder);
  }
  if (state.pageIndex > 0) params.set(PARAM.page, String(state.pageIndex + 1));
  if (state.pageSize !== DEFAULT_EVIDENCE_PAGE_SIZE) {
    params.set(PARAM.size, String(state.pageSize));
  }
};

export const hasActiveEvidenceFilters = (state: EvidenceState): boolean =>
  state.search.trim().length > 0 ||
  state.types.length > 0 ||
  state.indicatorTypes.length > 0 ||
  state.addedBy.length > 0 ||
  state.sinceHandoff;

/** The request fields that decide which items match, without paging. */
export type EvidenceFilterRequest = Pick<
  FindItemsRequest,
  | 'kind'
  | 'type'
  | 'indicator_type'
  | 'added_by'
  | 'search'
  | 'created_after'
  | 'sort_field'
  | 'sort_order'
>;

export const toFilterRequest = (
  state: EvidenceState,
  handoffAt: string | undefined
): EvidenceFilterRequest => ({
  kind: ['evidence'],
  type: state.types.length ? state.types : undefined,
  indicator_type: state.indicatorTypes.length ? state.indicatorTypes : undefined,
  added_by: state.addedBy.length ? state.addedBy : undefined,
  search: state.search.trim() || undefined,
  created_after: state.sinceHandoff ? handoffAt : undefined,
  sort_field: EVIDENCE_SORT_FIELDS[state.sortKey],
  sort_order: state.sortOrder,
});

/** The last page reachable with page numbers; beyond it the cursor is used. */
export const getMaxAddressablePageIndex = (pageSize: number): number =>
  Math.floor(INVESTIGATION_LIMITS.maxDeepPageFrom / pageSize) - 1;

export interface UseEvidenceUrlState {
  state: EvidenceState;
  /** Merges a change into the state. Changing anything but the page goes back to page one. */
  update: (change: Partial<EvidenceState>) => void;
  clearFilters: () => void;
  /** Opens the detail flyout for an item by writing `item=<id>`; `undefined` closes it. */
  setOpenItem: (itemId: string | undefined) => void;
}

/**
 * The evidence filters, search, sort and page, plus the open item, kept in the URL query so a
 * reload restores them. Other parameters (such as `tab`) are left untouched.
 */
export const useEvidenceUrlState = (): UseEvidenceUrlState => {
  const history = useHistory();
  const { search } = useLocation();
  const state = useMemo(() => parseEvidenceState(search), [search]);

  const writeParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(history.location.search);
      mutate(params);
      const query = params.toString();
      history.replace({ pathname: history.location.pathname, search: query ? `?${query}` : '' });
    },
    [history]
  );

  const update = useCallback(
    (change: Partial<EvidenceState>) => {
      writeParams((params) => {
        const current = parseEvidenceState(history.location.search);
        const next: EvidenceState = {
          ...current,
          pageIndex: 'pageIndex' in change ? current.pageIndex : 0,
          ...change,
        };
        writeEvidenceState(params, next);
      });
    },
    [history, writeParams]
  );

  const clearFilters = useCallback(() => {
    writeParams((params) => {
      const current = parseEvidenceState(history.location.search);
      writeEvidenceState(params, {
        ...DEFAULT_EVIDENCE_STATE,
        sortKey: current.sortKey,
        sortOrder: current.sortOrder,
        pageSize: current.pageSize,
      });
    });
  }, [history, writeParams]);

  const setOpenItem = useCallback(
    (itemId: string | undefined) => {
      writeParams((params) => {
        if (itemId) {
          params.set(PARAM.item, itemId);
        } else {
          params.delete(PARAM.item);
        }
      });
    },
    [writeParams]
  );

  return { state, update, clearFilters, setOpenItem };
};
