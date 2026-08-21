/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiNotificationBadge,
  EuiSkeletonTitle,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AutomationsPanel,
  DescriptionPanel,
  KiListPanel,
  SignalsPanel,
  SourcesPanel,
} from '../components/ai_index_detail';
import { EditSourcesFlyout } from '../components/edit_sources_flyout';
import { useAiIndex } from '../hooks/use_ai_index';
import { useKiList } from '../hooks/use_ki_list';
import { useNavigation } from '../hooks/use_navigation';
import { CONTEXT_ENGINE_PATHS } from '../paths';

type DetailTabId = 'overview' | 'knowledge_indicators';

const backToListLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.backToListButton', {
  defaultMessage: 'Back to AI indexes',
});

export const AiIndexDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { aiIndex, isLoading, error, refetch } = useAiIndex(id);
  const { createContextEngineUrl } = useNavigation();
  const [isEditingSources, setIsEditingSources] = useState(false);
  const [selectedTab, setSelectedTab] = useState<DetailTabId>('overview');

  const { total: kiTotal } = useKiList({
    aiIndexId: aiIndex?.id,
    size: 1,
    enabled: aiIndex !== undefined,
  });

  const landingUrl = createContextEngineUrl(CONTEXT_ENGINE_PATHS.landing);
  const isManaged = aiIndex !== undefined && aiIndex.managed;
  const hideEditControls = isLoading || isManaged;

  if (error) {
    return (
      <KibanaPageTemplate data-test-subj="contextAiIndexDetailPage">
        <KibanaPageTemplate.Section>
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
            actions={[
              <EuiButton
                key="back-to-list"
                iconType="chevronSingleLeft"
                href={landingUrl}
                data-test-subj="contextAiIndexBackToListButton"
              >
                {backToListLabel}
              </EuiButton>,
            ]}
          />
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    );
  }

  const pageTitle = isLoading ? (
    <EuiSkeletonTitle size="l" data-test-subj="contextAiIndexTitleLoading" />
  ) : (
    <EuiFlexGroup alignItems="baseline" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>{aiIndex?.id}</EuiFlexItem>
      {isManaged && (
        <EuiFlexItem grow={false}>
          <EuiText
            component="span"
            size="s"
            color="subdued"
            data-test-subj="contextAiIndexDetailManagedBadge"
          >
            <EuiIcon type="lock" size="s" aria-hidden={true} />{' '}
            <FormattedMessage
              id="xpack.contextEngine.aiIndexDetail.managedBadge"
              defaultMessage="Managed"
            />
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  return (
    <KibanaPageTemplate data-test-subj="contextAiIndexDetailPage">
      <KibanaPageTemplate.Header
        pageTitle={pageTitle}
        rightSideItems={[
          <EuiButtonEmpty
            key="back-to-list"
            iconType="chevronSingleLeft"
            href={landingUrl}
            data-test-subj="contextAiIndexBackToListButton"
          >
            {backToListLabel}
          </EuiButtonEmpty>,
        ]}
      />
      <KibanaPageTemplate.Section>
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
              kiTotal > 0 ? <EuiNotificationBadge>{kiTotal}</EuiNotificationBadge> : undefined
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
              sources={aiIndex?.sources ?? []}
              canEdit={aiIndex !== undefined}
              onEditSources={() => setIsEditingSources(true)}
              isManaged={hideEditControls}
            />
            <EuiSpacer size="m" />
            <AutomationsPanel
              isLoading={isLoading}
              aiIndex={aiIndex}
              onSaved={refetch}
              isManaged={isManaged}
            />
            <EuiSpacer size="m" />
            <SignalsPanel isLoading={isLoading} aiIndex={aiIndex} />
          </>
        )}

        {selectedTab === 'knowledge_indicators' && aiIndex && <KiListPanel aiIndex={aiIndex} />}
      </KibanaPageTemplate.Section>
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
    </KibanaPageTemplate>
  );
};
