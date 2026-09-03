/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { KI_SUMMARY_PAGE_SIZE } from '../../../common/constants';
import {
  AutomationsPanel,
  DescriptionPanel,
  ImprovementsPanel,
  SignalsPanel,
  SourcesPanel,
} from '../components/ai_index_detail';
import { KiListPanel } from '../components/ki';
import { EditSourcesFlyout } from '../components/edit_sources_flyout';
import { useAiIndex } from '../hooks/use_ai_index';
import { useKiList } from '../hooks/use_ki_list';
import { useNavigation } from '../hooks/use_navigation';
import { usePublishViewedAiIndex } from '../hooks/use_publish_viewed_ai_index';
import { ContextEngineSubPageHeader } from '../layout/context_engine_page_header';
import {
  ContextEnginePageSection,
  ContextEnginePageTemplate,
} from '../layout/context_engine_page_template';
import { CONTEXT_ENGINE_PATHS } from '../paths';

type DetailTabId = 'overview' | 'knowledge_indicators';

const backToContextLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.backToContext', {
  defaultMessage: 'Back to Context',
});

const managedBadgeLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.managedBadge', {
  defaultMessage: 'Managed',
});

export const AiIndexDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { aiIndex, isLoading, error, refetch } = useAiIndex(id);
  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();
  const [isEditingSources, setIsEditingSources] = useState(false);
  const [selectedTab, setSelectedTab] = useState<DetailTabId>('overview');

  const { summary } = useKiList({
    aiIndexId: aiIndex?.id,
    size: KI_SUMMARY_PAGE_SIZE,
    enabled: aiIndex !== undefined,
  });

  usePublishViewedAiIndex(aiIndex);

  const isManaged = aiIndex !== undefined && aiIndex.managed;
  const hideEditControls = isLoading || isManaged;

  /**
   * Automations read from an index's sources, so until there are sources there is nothing for one
   * to do, and offering to write one only draws attention away from the setup that has to come
   * first. Automations that already exist keep the panel visible however the index got that way:
   * hiding them would leave them running with no way to see or remove them.
   *
   * Withheld until the index has loaded rather than shown as a skeleton, so an index that is about
   * to be set up never flashes the step that comes after.
   */
  const showAutomations =
    aiIndex !== undefined && (aiIndex.sources.length > 0 || aiIndex.automations.length > 0);
  const pageTitle = aiIndex?.id ?? id ?? '';
  const backHref = createContextEngineUrl(CONTEXT_ENGINE_PATHS.landing);

  const pageTitleContent = useMemo(
    () => (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <span data-test-subj="contextAiIndexDetailPageTitle">{pageTitle}</span>
        </EuiFlexItem>
        {isManaged && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="contextAiIndexDetailManagedBadge">
              {managedBadgeLabel}
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ),
    [isManaged, pageTitle]
  );

  const pageContent = error ? (
    <EuiEmptyPrompt
      iconType="error"
      color="danger"
      data-test-subj="contextAiIndexDetailError"
      title={
        <h2>
          <FormattedMessage
            id="xpack.contextEngine.aiIndexDetail.error.title"
            defaultMessage="Unable to load AI index"
          />
        </h2>
      }
      body={<p>{error.message}</p>}
    />
  ) : (
    <>
      <EuiTabs data-test-subj="contextAiIndexDetailTabs">
        <EuiTab
          isSelected={selectedTab === 'overview'}
          onClick={() => setSelectedTab('overview')}
          data-test-subj="contextAiIndexDetailTab-overview"
        >
          <FormattedMessage
            id="xpack.contextEngine.aiIndexDetail.tabs.overview"
            defaultMessage="Overview"
          />
        </EuiTab>
        <EuiTab
          isSelected={selectedTab === 'knowledge_indicators'}
          onClick={() => setSelectedTab('knowledge_indicators')}
          append={
            summary.total > 0 ? (
              <EuiNotificationBadge>{summary.total}</EuiNotificationBadge>
            ) : undefined
          }
          data-test-subj="contextAiIndexDetailTab-knowledge_indicators"
        >
          <FormattedMessage
            id="xpack.contextEngine.aiIndexDetail.tabs.knowledgeIndicators"
            defaultMessage="Knowledge Indicators"
          />
        </EuiTab>
      </EuiTabs>

      <EuiSpacer size="m" />

      {selectedTab === 'overview' && (
        <>
          <DescriptionPanel
            isLoading={isLoading}
            aiIndex={aiIndex}
            onSaved={refetch}
            isManaged={isManaged}
          />
          <EuiSpacer size="m" />
          <SourcesPanel
            isLoading={isLoading}
            aiIndex={aiIndex}
            canEdit={aiIndex !== undefined}
            onEditSources={() => setIsEditingSources(true)}
            onSaved={refetch}
            isManaged={hideEditControls}
          />
          {showAutomations && (
            <>
              <EuiSpacer size="m" />
              <AutomationsPanel
                isLoading={isLoading}
                aiIndex={aiIndex}
                onSaved={refetch}
                isManaged={isManaged}
              />
            </>
          )}
          <EuiSpacer size="m" />
          <ImprovementsPanel isLoading={isLoading} aiIndex={aiIndex} />
          <EuiSpacer size="m" />
          <SignalsPanel isLoading={isLoading} aiIndex={aiIndex} />
        </>
      )}

      {selectedTab === 'knowledge_indicators' && aiIndex && <KiListPanel aiIndex={aiIndex} />}

      {isEditingSources && aiIndex && (
        <EditSourcesFlyout
          aiIndex={aiIndex}
          onClose={() => setIsEditingSources(false)}
          onSaved={() => {
            setIsEditingSources(false);
            refetch();
          }}
        />
      )}
    </>
  );

  return (
    <ContextEnginePageTemplate
      data-test-subj="contextAiIndexDetailPage"
      breadcrumbPageName={pageTitle || undefined}
    >
      <ContextEngineSubPageHeader
        backLabel={backToContextLabel}
        backHref={backHref}
        onBackClick={(event) => {
          event.preventDefault();
          navigateToContextEngine(CONTEXT_ENGINE_PATHS.landing);
        }}
        pageTitle={pageTitleContent}
      />
      <ContextEnginePageSection>{pageContent}</ContextEnginePageSection>
    </ContextEnginePageTemplate>
  );
};
