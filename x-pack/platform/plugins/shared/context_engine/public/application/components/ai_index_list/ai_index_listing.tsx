/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContentList, ContentListToolbar } from '@kbn/content-list';
import { createFilterControl } from '@kbn/content-list-provider-client';
import React from 'react';
import { aiIndexOwnerFilter, aiIndexTypeFilter } from '../../utils/ai_index_content_list_utils';
import { AiIndexCardGrid } from './ai_index_card_grid';
import { AiIndexListPagination } from './ai_index_list_pagination';

const AiIndexTypeFilter = createFilterControl(aiIndexTypeFilter, {
  'data-test-subj': 'contextAiIndexListTypeFilter',
});

const AiIndexOwnerFilter = createFilterControl(aiIndexOwnerFilter, {
  'data-test-subj': 'contextAiIndexListOwnerFilter',
});

export const AiIndexListing = () => (
  <ContentList emptyState={null}>
    <ContentListToolbar data-test-subj="contextAiIndexList">
      <ContentListToolbar.Filters>
        <AiIndexTypeFilter />
        <AiIndexOwnerFilter />
      </ContentListToolbar.Filters>
    </ContentListToolbar>
    <AiIndexCardGrid />
    <AiIndexListPagination />
  </ContentList>
);
