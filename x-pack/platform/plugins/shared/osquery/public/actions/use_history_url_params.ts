/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { parse, stringify } from 'query-string';
import type { SourceFilter } from '../../common/api/unified_history/types';
import { DEFAULT_START_DATE, DEFAULT_END_DATE } from './components/history_filters';

const VALID_SOURCES: readonly SourceFilter[] = ['live', 'rule', 'scheduled'];

export interface HistoryUrlFilters {
  q: string;
  sources: SourceFilter[];
  runBy: string[];
  start: string;
  end: string;
  pageSize: number | undefined;
}

const DEFAULTS: Omit<HistoryUrlFilters, 'pageSize'> = {
  q: '',
  sources: [],
  runBy: [],
  start: DEFAULT_START_DATE,
  end: DEFAULT_END_DATE,
};

const parseCommaSeparated = (value: string | string[] | null | undefined): string[] => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return [];
  return raw.split(',').filter(Boolean);
};

const parseSourceFilters = (value: string | string[] | null | undefined): SourceFilter[] => {
  return parseCommaSeparated(value).filter((v): v is SourceFilter =>
    VALID_SOURCES.includes(v as SourceFilter)
  );
};

const parsePageSize = (value: string | string[] | null | undefined): number | undefined => {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : undefined;
};

const parseString = (value: string | string[] | null | undefined): string => {
  if (!value) return '';
  return Array.isArray(value) ? value[0] ?? '' : value;
};

export const parseHistoryUrlParams = (search: string): HistoryUrlFilters => {
  const params = parse(search);

  return {
    q: parseString(params.q) || DEFAULTS.q,
    sources: parseSourceFilters(params.sources),
    runBy: parseCommaSeparated(params.runBy),
    start: parseString(params.start) || DEFAULTS.start,
    end: parseString(params.end) || DEFAULTS.end,
    pageSize: parsePageSize(params.pageSize),
  };
};

export const serializeHistoryUrlParams = (
  filters: HistoryUrlFilters
): Record<string, string | undefined> => {
  return {
    q: filters.q || undefined,
    sources: filters.sources.length > 0 ? filters.sources.join(',') : undefined,
    runBy: filters.runBy.length > 0 ? filters.runBy.join(',') : undefined,
    start: filters.start !== DEFAULTS.start ? filters.start : undefined,
    end: filters.end !== DEFAULTS.end ? filters.end : undefined,
    pageSize: filters.pageSize != null ? String(filters.pageSize) : undefined,
  };
};

export const useHistoryUrlParams = () => {
  const history = useHistory();
  const { search, pathname } = useLocation();

  const filters = useMemo(() => parseHistoryUrlParams(search), [search]);

  const replaceUrl = useCallback(
    (nextFilters: HistoryUrlFilters) => {
      const serialized = serializeHistoryUrlParams(nextFilters);
      const qs = stringify(serialized, { sort: false, skipNull: true });
      history.replace({ pathname, search: qs ? `?${qs}` : '' });
    },
    [history, pathname]
  );

  const setFilter = useCallback(
    <K extends keyof HistoryUrlFilters>(key: K, value: HistoryUrlFilters[K]) => {
      replaceUrl({ ...filters, [key]: value });
    },
    [filters, replaceUrl]
  );

  const setFilters = useCallback(
    (partial: Partial<HistoryUrlFilters>) => {
      replaceUrl({ ...filters, ...partial });
    },
    [filters, replaceUrl]
  );

  return { filters, setFilter, setFilters };
};
