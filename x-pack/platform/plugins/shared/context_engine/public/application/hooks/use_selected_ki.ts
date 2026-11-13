/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import type { KiListItem } from '../../../common/http_api/knowledge_indicators';
import { KI_DOC_QUERY_PARAM, KI_INDEX_QUERY_PARAM, getKiDocQueryParams } from '../paths';

export interface SelectedKi {
  kiId: string;
  index: string;
}

export interface SelectKiOptions {
  /** Replace the current history entry instead of adding a new one. */
  replace?: boolean;
}

interface UseSelectedKiResult {
  selectedKi: SelectedKi | undefined;
  selectKi: (ki: Pick<KiListItem, 'id' | 'index'>, options?: SelectKiOptions) => void;
}

/** Reads and writes the Knowledge document selected on the tab (`?doc=<id>&index=<index>`). */
export const useSelectedKi = (): UseSelectedKiResult => {
  const history = useHistory();
  const { pathname, search } = useLocation();

  const selectedKi = useMemo((): SelectedKi | undefined => {
    const params = new URLSearchParams(search);
    const kiId = params.get(KI_DOC_QUERY_PARAM);
    if (kiId === null || kiId.length === 0) {
      return undefined;
    }
    return { kiId, index: params.get(KI_INDEX_QUERY_PARAM) ?? '' };
  }, [search]);

  const selectKi = useCallback(
    (
      { id, index }: Pick<KiListItem, 'id' | 'index'>,
      { replace = false }: SelectKiOptions = {}
    ) => {
      const params = new URLSearchParams(search);
      params.delete(KI_DOC_QUERY_PARAM);
      params.delete(KI_INDEX_QUERY_PARAM);
      Object.entries(getKiDocQueryParams(id, index)).forEach(([key, value]) =>
        params.set(key, value)
      );
      const location = { pathname, search: `?${params}` };
      if (replace) {
        history.replace(location);
        return;
      }
      history.push(location);
    },
    [history, pathname, search]
  );

  return { selectedKi, selectKi };
};
