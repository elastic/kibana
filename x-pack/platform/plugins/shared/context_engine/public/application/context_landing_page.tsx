/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiLink, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ContentList, ContentListFooter, ContentListToolbar } from '@kbn/content-list';
import { ContentListClientProvider, createFilterControl } from '@kbn/content-list-provider-client';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import {
  AiIndexCardGrid,
  AiIndexListError,
  AiIndexManagedRowList,
  AiIndexOnboardingPanel,
} from './components/ai_index_list';
import { CreateAiIndexButton } from './components/create_ai_index_button';
import { useAiIndexListMode } from './hooks/use_ai_index_list_mode';
import { useListAiIndices } from './hooks/use_list_ai_indices';
import { useKibana } from './hooks/use_kibana';
import {
  ContextEnginePageSection,
  ContextEnginePageTemplate,
} from './layout/context_engine_page_template';
import {
  AI_INDICES_PER_PAGE,
  AI_INDEX_LIST_LABELS,
  aiIndexOwnerFilter,
} from './utils/ai_index_content_list_utils';

const AiIndexOwnerFilter = createFilterControl(aiIndexOwnerFilter, {
  'data-test-subj': 'contextAiIndexListOwnerFilter',
});

const ContextLandingPageContent = ({
  hasCustomAiIndices,
  isLoading,
}: {
  hasCustomAiIndices: boolean;
  isLoading: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const { services } = useKibana();
  const contextEngineLinks = services.docLinks.links.contextEngine;
  const { mode, error } = useAiIndexListMode(hasCustomAiIndices, isLoading);

  return (
    <ContextEnginePageTemplate data-test-subj="contextLandingPage">
      <KibanaPageTemplate.Header
        pageTitle={i18n.translate('xpack.contextEngine.landing.title', {
          defaultMessage: 'Context',
        })}
        description={
          <FormattedMessage
            id="xpack.contextEngine.landing.description"
            defaultMessage="Turn raw source data into distilled context agents can use to solve problems faster. {learnMoreLink}"
            values={{
              learnMoreLink: (
                <EuiLink href={contextEngineLinks.overview} target="_blank">
                  {i18n.translate('xpack.contextEngine.landing.learnMore', {
                    defaultMessage: 'Learn more',
                  })}
                </EuiLink>
              ),
            }}
          />
        }
        restrictWidth
        bottomBorder={false}
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePlain};
        `}
        rightSideItems={
          mode !== 'empty' && mode !== 'onboarding'
            ? [<CreateAiIndexButton key="create-ai-index-button" />]
            : []
        }
      />
      <EuiHorizontalRule margin="none" data-test-subj="contextLandingPageHeaderDivider" />
      <ContextEnginePageSection>
        {error ? (
          <AiIndexListError error={error} />
        ) : (
          <ContentList emptyState={<AiIndexOnboardingPanel />}>
            {mode === 'onboarding' ? (
              <>
                <AiIndexOnboardingPanel />
                <AiIndexManagedRowList />
              </>
            ) : (
              <>
                <ContentListToolbar data-test-subj="contextAiIndexList">
                  <ContentListToolbar.Filters>
                    <AiIndexOwnerFilter />
                  </ContentListToolbar.Filters>
                </ContentListToolbar>
                <AiIndexCardGrid />
                <ContentListFooter data-test-subj="contextAiIndexListFooter" />
              </>
            )}
          </ContentList>
        )}
      </ContextEnginePageSection>
    </ContextEnginePageTemplate>
  );
};

export const ContextLandingPage = () => {
  const { services } = useKibana();
  const { findItems, hasCustomAiIndices, isLoading } = useListAiIndices();

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
          aiIndexOwner: aiIndexOwnerFilter,
        },
      }}
    >
      <ContextLandingPageContent hasCustomAiIndices={hasCustomAiIndices} isLoading={isLoading} />
    </ContentListClientProvider>
  );
};
