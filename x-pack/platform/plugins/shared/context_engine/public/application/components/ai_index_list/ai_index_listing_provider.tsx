/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContentListClientProvider } from '@kbn/content-list-provider-client';
import React, { type ReactNode } from 'react';
import { useAiIndexFindItems } from '../../hooks/use_list_ai_indices';
import { useKibana } from '../../hooks/use_kibana';
import {
  AI_INDICES_PER_PAGE,
  AI_INDEX_LIST_LABELS,
  aiIndexOwnerFilter,
  aiIndexTypeFilter,
} from '../../utils/ai_index_content_list_utils';

interface AiIndexListingProviderProps {
  children: ReactNode;
}

export const AiIndexListingProvider = ({ children }: AiIndexListingProviderProps) => {
  const { services } = useKibana();
  const findItems = useAiIndexFindItems();

  return (
    <ContentListClientProvider
      id="context-engine-ai-indices"
      core={services}
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
