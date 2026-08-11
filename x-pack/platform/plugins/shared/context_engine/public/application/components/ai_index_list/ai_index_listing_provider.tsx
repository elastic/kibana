/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContentListClientProvider } from '@kbn/content-list-provider-client';
import React, { useMemo, type ReactNode } from 'react';
import type { AiIndexHttpItem } from '../../../../common/http_api/ai_indices';
import { useKibana } from '../../hooks/use_kibana';
import {
  AI_INDICES_PER_PAGE,
  AI_INDEX_LIST_LABELS,
  aiIndexOwnerFilter,
  aiIndexTypeFilter,
  createFindAiIndices,
} from '../../utils/ai_index_content_list_utils';

interface AiIndexListingProviderProps {
  aiIndices: AiIndexHttpItem[];
  children: ReactNode;
}

export const AiIndexListingProvider = ({ aiIndices, children }: AiIndexListingProviderProps) => {
  const { services: core } = useKibana();
  const findItems = useMemo(() => createFindAiIndices(aiIndices), [aiIndices]);

  return (
    <ContentListClientProvider
      id="context-engine-ai-indices"
      core={core}
      labels={AI_INDEX_LIST_LABELS}
      findItems={findItems}
      features={{
        sorting: false,
        selection: false,
        pagination: {
          initialPageSize: AI_INDICES_PER_PAGE,
          pageSizeOptions: [AI_INDICES_PER_PAGE],
        },
        filters: {
          aiIndexType: aiIndexTypeFilter,
          aiIndexOwner: aiIndexOwnerFilter,
        },
      }}
    >
      {children}
    </ContentListClientProvider>
  );
};
