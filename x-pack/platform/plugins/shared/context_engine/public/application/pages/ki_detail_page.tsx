/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSpacer,
} from '@elastic/eui';
import type { AppHeaderBadge, AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import type { GetKiResponse } from '../../../common/http_api/knowledge_indicators';
import { AI_INDEX_KNOWLEDGE_INDICATORS_TAB_LOCATION_STATE } from '../ai_index_created_location_state';
import { KiDetailContentPanel } from '../components/ki/ki_detail_content_panel';
import { KiDetailDetailsPanel } from '../components/ki/ki_detail_details_panel';
import { readKiGovernance } from '../components/ki/ki_detail_helpers';
import { KiDetailRawJsonPanel } from '../components/ki/ki_detail_raw_json_panel';
import { getKiDisplayTypeLabel } from '../components/ki/helpers';
import { useKi } from '../hooks/use_ki';
import { useNavigation } from '../hooks/use_navigation';
import { ContextEngineSubPageHeader } from '../layout/context_engine_page_header';
import {
  ContextEnginePageSection,
  ContextEnginePageTemplate,
} from '../layout/context_engine_page_template';
import { getAiIndexDetailPath, parseKiIdFromRouteParam } from '../paths';

type KiDetailTabId = 'details' | 'document';

const backDestinationLabel = i18n.translate('xpack.contextEngine.kiDetail.backDestination', {
  defaultMessage: 'AI index',
});

const contentTabLabel = i18n.translate('xpack.contextEngine.kiDetail.tabs.content', {
  defaultMessage: 'Content',
});

const documentTabLabel = i18n.translate('xpack.contextEngine.kiDetail.tabs.document', {
  defaultMessage: 'Document',
});

const getPageTitle = (ki: GetKiResponse | undefined, kiId: string): string => {
  if (!ki) {
    return kiId;
  }
  const titleValue = ki.document.title;
  if (typeof titleValue === 'string' && titleValue.trim().length > 0) {
    return titleValue.trim();
  }
  return ki.id;
};

export const KiDetailPage = () => {
  const { id: aiIndexIdParam = '', kiId: kiIdParam = '' } = useParams<{
    id: string;
    kiId: string;
  }>();
  const aiIndexId = useMemo(() => parseKiIdFromRouteParam(aiIndexIdParam), [aiIndexIdParam]);
  const kiId = useMemo(() => parseKiIdFromRouteParam(kiIdParam), [kiIdParam]);
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const index = searchParams.get('index') ?? '';

  const { ki, isLoading, error } = useKi({
    aiIndexId,
    kiId,
    index,
    enabled: index.length > 0,
  });

  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();

  const [selectedTab, setSelectedTab] = useState<KiDetailTabId>('details');

  const pageTitle = getPageTitle(ki, kiId);
  const backHref = createContextEngineUrl(getAiIndexDetailPath(aiIndexId));

  const { lifecycleStatus } = ki ? readKiGovernance(ki.document) : { lifecycleStatus: undefined };

  const headerBadges = useMemo((): AppHeaderBadge[] | undefined => {
    if (!ki) {
      return undefined;
    }
    const badges: AppHeaderBadge[] = [];
    const typeValue = ki.document.type;
    if (typeof typeValue === 'string' && typeValue.length > 0) {
      badges.push({
        label: getKiDisplayTypeLabel(typeValue),
        color: 'hollow',
        'data-test-subj': 'contextKiDetailTypeBadge',
      });
    }
    if (lifecycleStatus === 'deleted') {
      badges.push({
        label: i18n.translate('xpack.contextEngine.kiDetail.badge.deleted', {
          defaultMessage: 'Deleted',
        }),
        color: 'danger',
        'data-test-subj': 'contextKiDetailDeletedBadge',
      });
    }
    return badges.length > 0 ? badges : undefined;
  }, [ki, lifecycleStatus]);

  const headerTabs = useMemo((): AppHeaderTab[] | undefined => {
    if (!ki || error) {
      return undefined;
    }

    return [
      {
        id: 'details',
        label: contentTabLabel,
        isSelected: selectedTab === 'details',
        onClick: () => setSelectedTab('details'),
        'data-test-subj': 'contextKiDetailTab-details',
      },
      {
        id: 'document',
        label: documentTabLabel,
        isSelected: selectedTab === 'document',
        onClick: () => setSelectedTab('document'),
        'data-test-subj': 'contextKiDetailTab-document',
      },
    ];
  }, [error, ki, selectedTab]);

  const handleBackClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      navigateToContextEngine(
        getAiIndexDetailPath(aiIndexId),
        undefined,
        AI_INDEX_KNOWLEDGE_INDICATORS_TAB_LOCATION_STATE
      );
    },
    [aiIndexId, navigateToContextEngine]
  );

  const missingIndexContent = (
    <EuiEmptyPrompt
      iconType="error"
      color="danger"
      data-test-subj="contextKiDetailMissingIndex"
      title={
        <h2>
          <FormattedMessage
            id="xpack.contextEngine.kiDetail.missingIndex.title"
            defaultMessage="Missing index parameter"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.contextEngine.kiDetail.missingIndex.body"
            defaultMessage="Open this page from the Knowledge Indicators list."
          />
        </p>
      }
    />
  );

  const errorContent = error ? (
    <EuiEmptyPrompt
      iconType="error"
      color="danger"
      data-test-subj="contextKiDetailError"
      title={
        <h2>
          <FormattedMessage
            id="xpack.contextEngine.kiDetail.error.title"
            defaultMessage="Unable to load Knowledge Indicator"
          />
        </h2>
      }
      body={<p>{error.message}</p>}
    />
  ) : null;

  const loadingContent = isLoading ? (
    <>
      <EuiSkeletonRectangle height={120} />
      <EuiSpacer size="m" />
      <EuiSkeletonText lines={6} />
    </>
  ) : null;

  const mainContent =
    ki && !error ? (
      selectedTab === 'document' ? (
        <KiDetailRawJsonPanel ki={ki} />
      ) : (
        <EuiFlexGroup
          gutterSize="xl"
          responsive
          alignItems="stretch"
          data-test-subj="contextKiDetailContentTabLayout"
        >
          <EuiFlexItem data-test-subj="contextKiDetailMainColumn">
            <KiDetailContentPanel document={ki.document} />
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
            style={{ width: '26rem' }}
            data-test-subj="contextKiDetailSidebar"
          >
            <KiDetailDetailsPanel kiId={ki.id} document={ki.document} />
          </EuiFlexItem>
        </EuiFlexGroup>
      )
    ) : null;

  const pageBody =
    index.length === 0 ? missingIndexContent : errorContent ?? loadingContent ?? mainContent;

  return (
    <ContextEnginePageTemplate breadcrumbPageName={pageTitle} data-test-subj="contextKiDetailPage">
      <ContextEngineSubPageHeader
        backDestinationLabel={backDestinationLabel}
        backHref={backHref}
        onBackClick={handleBackClick}
        pageTitle={pageTitle}
        badges={headerBadges}
        tabs={headerTabs}
      />
      <ContextEnginePageSection
        {...(selectedTab === 'document'
          ? { restrictWidth: false, paddingSize: 'none' as const }
          : {})}
      >
        {pageBody}
      </ContextEnginePageSection>
    </ContextEnginePageTemplate>
  );
};
