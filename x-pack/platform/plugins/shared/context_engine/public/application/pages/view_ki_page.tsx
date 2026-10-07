/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import type { AppHeaderTab } from '@kbn/app-header';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { readKiDocumentLifecycleStatus } from '../../../common/ki_lifecycle_status';
import type { GetKiResponse } from '../../../common/http_api/knowledge_indicators';
import { CONTEXT_ENGINE_UI_EBT } from '../../../common/telemetry';
import { ViewKiContentLayout } from '../components/ki/view_ki_content_layout';
import { ViewKiRawJsonPanel } from '../components/ki/view_ki_raw_json_panel';
import { getViewKiHeaderBadges } from '../components/ki/view_ki_header_badges';
import { useKi } from '../hooks/use_ki';
import { useNavigation } from '../hooks/use_navigation';
import { ContextEngineSubPageHeader } from '../layout/context_engine_page_header';
import {
  ContextEnginePageSection,
  ContextEnginePageTemplate,
} from '../layout/context_engine_page_template';
import { getAiIndexDetailPath, getAiIndexKnowledgeIndicatorsPath } from '../paths';

type ViewKiTabId = 'details' | 'document';

const getPageTitle = (ki: GetKiResponse | undefined, kiId: string): string => {
  if (!ki) {
    return kiId;
  }
  const titleValue = ki.document.title;
  if (titleValue && typeof titleValue === 'string') {
    return titleValue;
  }
  return ki.id;
};

export const ViewKiPage = () => {
  const { id: aiIndexIdParam = '', kiId: kiIdParam = '' } = useParams<{
    id: string;
    kiId: string;
  }>();
  const aiIndexId = useMemo(() => decodeURIComponent(aiIndexIdParam), [aiIndexIdParam]);
  const kiId = useMemo(() => decodeURIComponent(kiIdParam), [kiIdParam]);
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

  const [selectedTab, setSelectedTab] = useState<ViewKiTabId>('details');

  const pageTitle = getPageTitle(ki, kiId);
  const backHref = createContextEngineUrl(getAiIndexDetailPath(aiIndexId));

  const lifecycleStatus = ki ? readKiDocumentLifecycleStatus(ki.document) : undefined;

  const headerBadges = useMemo(
    () => (ki ? getViewKiHeaderBadges(ki.document, lifecycleStatus) : undefined),
    [ki, lifecycleStatus]
  );

  const showHeaderTabs = index.length > 0 && !error;

  const headerTabs = useMemo((): AppHeaderTab[] | undefined => {
    if (!showHeaderTabs) {
      return undefined;
    }

    return [
      {
        id: 'details',
        label: i18n.translate('xpack.contextEngine.viewKi.tabs.content', {
          defaultMessage: 'Content',
        }),
        isSelected: selectedTab === 'details',
        onClick: () => setSelectedTab('details'),
        'data-test-subj': 'contextViewKiTab-details',
        ...getEbtProps({
          element: CONTEXT_ENGINE_UI_EBT.element.viewKiPage,
          action: CONTEXT_ENGINE_UI_EBT.action.viewKi.TAB_DETAILS,
        }),
      },
      {
        id: 'document',
        label: i18n.translate('xpack.contextEngine.viewKi.tabs.document', {
          defaultMessage: 'Document',
        }),
        isSelected: selectedTab === 'document',
        onClick: () => setSelectedTab('document'),
        'data-test-subj': 'contextViewKiTab-document',
        ...getEbtProps({
          element: CONTEXT_ENGINE_UI_EBT.element.viewKiPage,
          action: CONTEXT_ENGINE_UI_EBT.action.viewKi.TAB_DOCUMENT,
        }),
      },
    ];
  }, [selectedTab, showHeaderTabs]);

  const handleBackClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      navigateToContextEngine(getAiIndexKnowledgeIndicatorsPath(aiIndexId));
    },
    [aiIndexId, navigateToContextEngine]
  );

  const resolvedKiId = ki?.id ?? kiId;
  const showKiContent = index.length > 0 && !error && (isLoading || ki);

  return (
    <ContextEnginePageTemplate breadcrumbPageName={pageTitle} data-test-subj="contextViewKiPage">
      <ContextEngineSubPageHeader
        backDestinationLabel={i18n.translate('xpack.contextEngine.viewKi.backDestination', {
          defaultMessage: 'AI index',
        })}
        backHref={backHref}
        onBackClick={handleBackClick}
        pageTitle={pageTitle}
        badges={headerBadges}
        tabs={headerTabs}
      />
      <ContextEnginePageSection
        restrictWidth={selectedTab !== 'document'}
        paddingSize={selectedTab === 'document' ? 'none' : 'l'}
      >
        {index.length === 0 ? (
          <EuiEmptyPrompt
            iconType="error"
            color="danger"
            data-test-subj="contextViewKiMissingIndex"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.contextEngine.viewKi.missingIndex.title"
                  defaultMessage="Missing index parameter"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.contextEngine.viewKi.missingIndex.body"
                  defaultMessage="Open this page from the Knowledge Indicators list."
                />
              </p>
            }
          />
        ) : null}

        {error ? (
          <EuiEmptyPrompt
            iconType="error"
            color="danger"
            data-test-subj="contextViewKiError"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.contextEngine.viewKi.error.title"
                  defaultMessage="Unable to load Knowledge Indicator"
                />
              </h2>
            }
            body={<p>{error.message}</p>}
          />
        ) : null}

        {showKiContent ? (
          selectedTab === 'document' ? (
            <ViewKiRawJsonPanel document={ki?.document} isLoading={isLoading} />
          ) : (
            <ViewKiContentLayout
              document={ki?.document}
              kiId={resolvedKiId}
              isLoading={isLoading}
            />
          )
        ) : null}
      </ContextEnginePageSection>
    </ContextEnginePageTemplate>
  );
};
