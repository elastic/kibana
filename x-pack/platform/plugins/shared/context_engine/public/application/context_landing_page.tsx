/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ContentList, ContentListFooter, ContentListToolbar } from '@kbn/content-list';
import { ContentListClientProvider, createFilterControl } from '@kbn/content-list-provider-client';
import { useContentListItems } from '@kbn/content-list-provider';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { AiIndexCardGrid, AiIndexListEmpty, AiIndexListError } from './components/ai_index_list';
import { CreateAiIndexButton } from './components/create_ai_index_button';
import { useAiIndexFindItems } from './hooks/use_list_ai_indices';
import { useKibana } from './hooks/use_kibana';
import {
  ContextEnginePageSection,
  ContextEnginePageTemplate,
} from './layout/context_engine_page_template';
import {
  AI_INDICES_PER_PAGE,
  AI_INDEX_LIST_LABELS,
  aiIndexOwnerFilter,
  aiIndexTypeFilter,
} from './utils/ai_index_content_list_utils';

const AiIndexTypeFilter = createFilterControl(aiIndexTypeFilter, {
  'data-test-subj': 'contextAiIndexListTypeFilter',
});

const AiIndexOwnerFilter = createFilterControl(aiIndexOwnerFilter, {
  'data-test-subj': 'contextAiIndexListOwnerFilter',
});

const ContextLandingPageContent = () => {
  const { euiTheme } = useEuiTheme();
  const { error, hasNoItems } = useContentListItems();
  const showHeaderCreateButton = !hasNoItems;

  return (
    <ContextEnginePageTemplate data-test-subj="contextLandingPage">
      <KibanaPageTemplate.Header
        pageTitle={i18n.translate('xpack.contextEngine.landing.title', {
          defaultMessage: 'Context',
        })}
        description={i18n.translate('xpack.contextEngine.landing.description', {
          defaultMessage:
            'Manage AI Indexes to organize and retrieve contextual knowledge for your agents.',
        })}
        restrictWidth
        bottomBorder={false}
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePlain};
        `}
        rightSideItems={
          showHeaderCreateButton ? [<CreateAiIndexButton key="create-ai-index-button" />] : []
        }
      />
      <EuiHorizontalRule margin="none" data-test-subj="contextLandingPageHeaderDivider" />
      <ContextEnginePageSection>
        {error ? (
          <AiIndexListError error={error} />
        ) : (
          <ContentList emptyState={<AiIndexListEmpty />}>
            <ContentListToolbar data-test-subj="contextAiIndexList">
              <ContentListToolbar.Filters>
                <AiIndexTypeFilter />
                <AiIndexOwnerFilter />
              </ContentListToolbar.Filters>
            </ContentListToolbar>
            <AiIndexCardGrid />
            <ContentListFooter data-test-subj="contextAiIndexListFooter" />
          </ContentList>
        )}
      </ContextEnginePageSection>
    </ContextEnginePageTemplate>
  );
};

export const ContextLandingPage = () => {
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
      <ContextLandingPageContent />
    </ContentListClientProvider>
  );
};
