/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useHistory, useLocation, useRouteMatch } from 'react-router-dom';
import type { KiListItem } from '../../../common/http_api/knowledge_indicators';
import {
  CONTEXT_ENGINE_PATHS,
  KI_DOC_QUERY_PARAM,
  getAiIndexKnowledgeDocumentsPath,
  getKnowledgeDocumentPath,
} from '../paths';

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

/**
 * Reads and writes the Knowledge document selected on the tab:
 * `/ai_index/<id>/knowledge_documents/<index>?doc=<id>`.
 */
export const useSelectedKi = (): UseSelectedKiResult => {
  const history = useHistory();
  const { search } = useLocation();
  const match = useRouteMatch<{ id: string; index?: string }>({
    path: [
      CONTEXT_ENGINE_PATHS.detailKnowledgeDocument,
      CONTEXT_ENGINE_PATHS.detailKnowledgeDocuments,
    ],
    exact: true,
  });
  const aiIndexId = match?.params.id ?? '';
  const indexParam = match?.params.index ?? '';

  const selectedKi = useMemo((): SelectedKi | undefined => {
    const kiId = new URLSearchParams(search).get(KI_DOC_QUERY_PARAM);
    if (kiId === null || kiId.length === 0) {
      return undefined;
    }
    return { kiId, index: indexParam };
  }, [indexParam, search]);

  const selectKi = useCallback(
    (
      { id, index }: Pick<KiListItem, 'id' | 'index'>,
      { replace = false }: SelectKiOptions = {}
    ) => {
      const params = new URLSearchParams(search);
      params.set(KI_DOC_QUERY_PARAM, id);
      const location = {
        pathname:
          index.length > 0
            ? getKnowledgeDocumentPath(aiIndexId, index)
            : getAiIndexKnowledgeDocumentsPath(aiIndexId),
        search: `?${params}`,
      };
      if (replace) {
        history.replace(location);
        return;
      }
      history.push(location);
    },
    [aiIndexId, history, search]
  );

  return { selectedKi, selectKi };
};
