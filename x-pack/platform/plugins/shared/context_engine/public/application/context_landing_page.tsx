/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderMenu } from '@kbn/app-header';
import { ContentList, ContentListFooter, ContentListToolbar } from '@kbn/content-list';
import { ContentListClientProvider, createFilterControl } from '@kbn/content-list-provider-client';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../common/telemetry';
import {
  AiIndexCardGrid,
  AiIndexListError,
  AiIndexManagedRowList,
  AiIndexOnboardingPanel,
  CreateAiIndexModal,
} from './components/ai_index_list';
import { useAiIndexListMode } from './hooks/use_ai_index_list_mode';
import { useContextEngineBreadcrumbs } from './hooks/use_context_engine_breadcrumbs';
import { useListAiIndices } from './hooks/use_list_ai_indices';
import { useKibana } from './hooks/use_kibana';
import { ContextEngineLandingHeader } from './layout/context_engine_page_header';
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

const landingTitle = i18n.translate('xpack.contextEngine.landing.title', {
  defaultMessage: 'Context',
});

const landingDescriptionText = i18n.translate('xpack.contextEngine.landing.descriptionText', {
  defaultMessage:
    'Turn raw source data into distilled context agents can use to solve problems faster.',
});

const createAiIndexButtonLabel = i18n.translate('xpack.contextEngine.createAiIndexButton', {
  defaultMessage: 'Create AI Index',
});

const ContextLandingPageContent = ({
  hasCustomAiIndices,
  isLoading,
  onOpenCreateModal,
}: {
  hasCustomAiIndices: boolean;
  isLoading: boolean;
  onOpenCreateModal: () => void;
}) => {
  const { services } = useKibana();
  const contextEngineLinks = services.docLinks.links.contextEngine;
  const { mode, error } = useAiIndexListMode(hasCustomAiIndices, isLoading);

  useContextEngineBreadcrumbs();

  const showCreateInHeader = mode !== 'empty' && mode !== 'onboarding';

  const headerMenu = useMemo<AppHeaderMenu | undefined>(() => {
    if (!showCreateInHeader) {
      return undefined;
    }

    return {
      primaryActionItem: {
        id: 'createAiIndex',
        label: createAiIndexButtonLabel,
        iconType: 'plusCircle',
        run: onOpenCreateModal,
        testId: 'contextCreateAiIndexButton',
        ebt: {
          action: CONTEXT_ENGINE_UI_EBT.action.aiIndexList.CREATE,
          detail: CONTEXT_ENGINE_UI_EBT.element.aiIndexListPage,
        },
      },
    };
  }, [onOpenCreateModal, showCreateInHeader]);

  const headerDescription = useMemo(
    () => ({
      text: landingDescriptionText,
      learnMoreUrl: contextEngineLinks.overview,
    }),
    [contextEngineLinks.overview]
  );

  return (
    <ContextEnginePageTemplate data-test-subj="contextLandingPage">
      <ContextEngineLandingHeader
        pageTitle={landingTitle}
        description={headerDescription}
        menu={headerMenu}
        docLink={contextEngineLinks.overview}
      />
      <ContextEnginePageSection>
        {error ? (
          <AiIndexListError error={error} />
        ) : (
          <ContentList emptyState={<AiIndexOnboardingPanel onCreateClick={onOpenCreateModal} />}>
            {mode === 'onboarding' ? (
              <>
                <AiIndexOnboardingPanel onCreateClick={onOpenCreateModal} />
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { findItems, hasCustomAiIndices, isLoading } = useListAiIndices();

  return (
    <>
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
        <ContextLandingPageContent
          hasCustomAiIndices={hasCustomAiIndices}
          isLoading={isLoading}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
        />
      </ContentListClientProvider>
      {isCreateModalOpen && <CreateAiIndexModal onClose={() => setIsCreateModalOpen(false)} />}
    </>
  );
};
