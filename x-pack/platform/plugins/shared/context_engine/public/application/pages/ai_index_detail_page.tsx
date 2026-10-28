/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import type { AppHeaderBadge, AppHeaderMenu, AppHeaderTab } from '@kbn/app-header';
import type { AppMenuItemType } from '@kbn/app-menu';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { Route, Routes } from '@kbn/shared-ux-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation, useParams, useRouteMatch } from 'react-router-dom';
import { KI_SUMMARY_PAGE_SIZE } from '../../../common/constants';
import { CONTEXT_ENGINE_UI_EBT } from '../../../common/telemetry';
import {
  AiIndexCreatedCallout,
  AutomationsPanel,
  DescriptionPanel,
  LockedSectionPanel,
  MemoryPanel,
  SignalsPanel,
  SourcesPanel,
} from '../components/ai_index_detail';
import { ListKiPanel } from '../components/ki';
import { useAiIndex } from '../hooks/use_ai_index';
import { useAiIndexDestLinks } from '../hooks/use_ai_index_dest_links';
import { useAiIndexOverviewSections } from '../hooks/use_ai_index_overview_sections';
import { useContextEngineBreadcrumbs } from '../hooks/use_context_engine_breadcrumbs';
import { useListKi } from '../hooks/use_list_ki';
import { useMemoryEnabled } from '../hooks/use_memory_enabled';
import { useNavigation } from '../hooks/use_navigation';
import {
  ContextEngineSubPageHeader,
  contextEngineBackDestinationLabel,
} from '../layout/context_engine_page_header';
import {
  ContextEnginePageSection,
  ContextEnginePageTemplate,
} from '../layout/context_engine_page_template';
import {
  CONTEXT_ENGINE_PATHS,
  getAiIndexDetailPath,
  getAiIndexKnowledgeIndicatorsPath,
} from '../paths';
import type { AiIndexCreatedLocationState } from '../ai_index_created_location_state';

const managedBadgeLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.managedBadge', {
  defaultMessage: 'Managed',
});

const overviewTabLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.tabs.overview', {
  defaultMessage: 'Overview',
});

const knowledgeIndicatorsTabLabel = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.tabs.knowledgeIndicators',
  {
    defaultMessage: 'Knowledge Indicators',
  }
);

const automationsLockedAriaLabel = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.automations.lockedAriaLabel',
  {
    defaultMessage: 'Automations locked. Add a source above to unlock automations.',
  }
);

const editBackingIndexMenuLabel = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.listKi.editBackingIndexMenuLabel',
  {
    defaultMessage: 'Edit backing index',
  }
);

const discoverLinkLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.discoverLink', {
  defaultMessage: 'Open in Discover',
});

const signalsLockedAriaLabel = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.signals.lockedAriaLabel',
  {
    defaultMessage: 'Signals locked. Create an automation above to start collecting signals.',
  }
);

export const AiIndexDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation<AiIndexCreatedLocationState | undefined>();
  const history = useHistory<AiIndexCreatedLocationState | undefined>();
  const { aiIndex, isLoading, error, refetch } = useAiIndex(id);
  const { discoverHref, indexManagementHref } = useAiIndexDestLinks(aiIndex?.dest);
  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();
  const isMemoryEnabled = useMemoryEnabled();
  const isKnowledgeIndicatorsTab =
    useRouteMatch({ path: CONTEXT_ENGINE_PATHS.detailKnowledgeIndicators, exact: true }) !== null;
  const resolvedAiIndexId = aiIndex?.id ?? id ?? '';

  const [showCreatedCallout, setShowCreatedCallout] = useState(
    () => location.state?.aiIndexCreated === true
  );

  // Hide the callout as soon as the user adds a source.
  useEffect(() => {
    if (showCreatedCallout && aiIndex && aiIndex.sources.length > 0) {
      setShowCreatedCallout(false);
    }
  }, [aiIndex, showCreatedCallout]);

  // Remove aiIndexCreated from location state after it has been shown
  useEffect(() => {
    if (!location.state?.aiIndexCreated) {
      return;
    }

    history.replace({ ...location, state: undefined });
  }, [location, history]);

  const { summary, isLoading: isKiSummaryLoading } = useListKi({
    aiIndexId: aiIndex?.id,
    size: KI_SUMMARY_PAGE_SIZE,
    lifecycleStatus: ['active'],
    enabled: aiIndex !== undefined,
    notifyOnError: true,
  });

  const hasLoadedKiSummary = aiIndex !== undefined && !isKiSummaryLoading;
  const hasKnowledgeIndicators = hasLoadedKiSummary && summary.total > 0;
  const showKnowledgeIndicatorsTabInHeader = isKnowledgeIndicatorsTab || hasKnowledgeIndicators;

  const { hideEditControls, showAutomationsPanel, showSignalsSection, showSignalsPanel } =
    useAiIndexOverviewSections({
      aiIndex,
      isLoading,
    });
  const pageTitle = aiIndex?.id ?? id ?? '';
  const backHref = createContextEngineUrl(CONTEXT_ENGINE_PATHS.landing);

  useContextEngineBreadcrumbs(pageTitle ? [{ text: pageTitle }] : []);

  const headerBadges = useMemo<AppHeaderBadge[] | undefined>(
    () =>
      aiIndex?.managed
        ? [
            {
              label: managedBadgeLabel,
              color: 'hollow',
              'data-test-subj': 'contextAiIndexDetailManagedBadge',
            },
          ]
        : undefined,
    [aiIndex?.managed]
  );

  const headerMenu = useMemo<AppHeaderMenu | undefined>(() => {
    if (!isKnowledgeIndicatorsTab || !aiIndex) {
      return undefined;
    }

    const items: AppMenuItemType[] = [];

    if (indexManagementHref !== undefined) {
      items.push({
        id: 'contextListKiBackingIndex',
        label: editBackingIndexMenuLabel,
        iconType: 'index',
        href: indexManagementHref,
        overflow: true,
        testId: 'contextListKiPanelDestLink',
        ebt: { action: CONTEXT_ENGINE_UI_EBT.action.listKi.DEST_LINK },
      });
    }

    const primaryActionItem =
      discoverHref === undefined
        ? undefined
        : {
            id: 'contextListKiDiscover',
            label: discoverLinkLabel,
            iconType: 'discoverApp',
            href: discoverHref,
            testId: 'contextListKiDiscoverLink',
            ebt: { action: CONTEXT_ENGINE_UI_EBT.action.listKi.DISCOVER_LINK },
          };

    if (primaryActionItem === undefined && items.length === 0) {
      return undefined;
    }

    return {
      primaryActionItem,
      items,
    };
  }, [aiIndex, discoverHref, indexManagementHref, isKnowledgeIndicatorsTab]);

  const headerTabs = useMemo<AppHeaderTab[] | undefined>(() => {
    if (error) {
      return undefined;
    }

    const overviewTab: AppHeaderTab = {
      id: 'overview',
      label: overviewTabLabel,
      isSelected: showKnowledgeIndicatorsTabInHeader ? !isKnowledgeIndicatorsTab : true,
      onClick: () => navigateToContextEngine(getAiIndexDetailPath(resolvedAiIndexId)),
      'data-test-subj': 'contextAiIndexDetailTab-overview',
    };

    if (!showKnowledgeIndicatorsTabInHeader) {
      return [overviewTab];
    }

    return [
      overviewTab,
      {
        id: 'knowledge_indicators',
        label: knowledgeIndicatorsTabLabel,
        isSelected: isKnowledgeIndicatorsTab,
        onClick: () =>
          navigateToContextEngine(getAiIndexKnowledgeIndicatorsPath(resolvedAiIndexId)),
        badge: hasKnowledgeIndicators ? summary.total : undefined,
        'data-test-subj': 'contextAiIndexDetailTab-knowledge_indicators',
      },
    ];
  }, [
    error,
    hasKnowledgeIndicators,
    isKnowledgeIndicatorsTab,
    navigateToContextEngine,
    resolvedAiIndexId,
    showKnowledgeIndicatorsTabInHeader,
    summary.total,
  ]);

  const overviewTabContent = (
    <>
      {showCreatedCallout && (
        <AiIndexCreatedCallout
          onDismiss={() => setShowCreatedCallout(false)}
          showMemory={isMemoryEnabled && aiIndex?.memory_enabled === true}
        />
      )}
      <DescriptionPanel
        isLoading={isLoading}
        aiIndex={aiIndex}
        onSaved={refetch}
        isManaged={!!aiIndex?.managed}
      />
      {isMemoryEnabled && (
        <>
          <EuiSpacer size="m" />
          <MemoryPanel isLoading={isLoading} aiIndex={aiIndex} onSaved={refetch} />
        </>
      )}
      <EuiSpacer size="m" />
      <SourcesPanel
        isLoading={isLoading}
        aiIndex={aiIndex}
        onSaved={refetch}
        isManaged={hideEditControls}
      />
      <EuiSpacer size="m" />
      {showAutomationsPanel ? (
        <AutomationsPanel
          isLoading={isLoading}
          aiIndex={aiIndex}
          onSaved={refetch}
          isManaged={!!aiIndex?.managed}
        />
      ) : (
        <LockedSectionPanel
          data-test-subj="contextAutomationsLocked"
          ariaLabel={automationsLockedAriaLabel}
          title={
            <FormattedMessage
              id="xpack.contextEngine.aiIndexDetail.automations.title"
              defaultMessage="Automations"
            />
          }
          description={
            <FormattedMessage
              id="xpack.contextEngine.aiIndexDetail.automations.lockedBody"
              defaultMessage="Add a source above to unlock automations."
            />
          }
        />
      )}
      <EuiSpacer size="m" />
      {showSignalsSection &&
        (showSignalsPanel ? (
          <SignalsPanel isLoading={isLoading} aiIndex={aiIndex} />
        ) : (
          <LockedSectionPanel
            data-test-subj="contextSignalsLocked"
            ariaLabel={signalsLockedAriaLabel}
            title={
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.signals.title"
                defaultMessage="Signals"
              />
            }
            description={
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.signals.lockedBody"
                defaultMessage="Create an automation above to start collecting signals."
              />
            }
          />
        ))}
    </>
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
    <Routes>
      <Route path={CONTEXT_ENGINE_PATHS.detailKnowledgeIndicators} exact>
        {aiIndex ? <ListKiPanel aiIndex={aiIndex} discoverHref={discoverHref} /> : null}
      </Route>
      <Route path={CONTEXT_ENGINE_PATHS.detail} exact>
        {overviewTabContent}
      </Route>
    </Routes>
  );

  return (
    <ContextEnginePageTemplate data-test-subj="contextAiIndexDetailPage">
      <ContextEngineSubPageHeader
        backDestinationLabel={contextEngineBackDestinationLabel}
        backHref={backHref}
        onBackClick={(event) => {
          event.preventDefault();
          navigateToContextEngine(CONTEXT_ENGINE_PATHS.landing);
        }}
        pageTitle={pageTitle}
        menu={headerMenu}
        badges={headerBadges}
        tabs={headerTabs}
      />
      <ContextEnginePageSection>{pageContent}</ContextEnginePageSection>
    </ContextEnginePageTemplate>
  );
};
