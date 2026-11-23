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
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { AppHeaderBadge, AppHeaderMenu, AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { Route, Routes } from '@kbn/shared-ux-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation, useParams, useRouteMatch } from 'react-router-dom';
import { KI_SUMMARY_PAGE_SIZE } from '../../../common/constants';
import { KI_NOT_DELETED_STATUSES } from '../../../common/ki_lifecycle_status';
import { CONTEXT_ENGINE_UI_EBT } from '../../../common/telemetry';
import {
  AiIndexCreatedCallout,
  AutomationsSection,
  ConnectAgentPanel,
  FailedAutomationRunsCallout,
  KnowledgeDocumentsChartPanel,
  LearnMorePanel,
  ManageAutomationsLink,
  OverviewStatCards,
  RecentKnowledgeDocumentsPanel,
  SourcesPanel,
} from '../components/ai_index_detail';
import { buildAiIndexOnboardingPrompt } from '../components/ai_index_detail/onboarding_prompt';
import { SettingsTab } from '../components/ai_index_detail/settings';
import { SetupWizard } from '../components/ai_index_detail/setup_wizard';
import { ListKiPanel } from '../components/ki';
import { useAiIndex } from '../hooks/use_ai_index';
import { useAiIndexDestLinks } from '../hooks/use_ai_index_dest_links';
import { useAiIndexOverviewSections } from '../hooks/use_ai_index_overview_sections';
import { useContextEngineBreadcrumbs } from '../hooks/use_context_engine_breadcrumbs';
import { useKibanaUrl } from '../hooks/use_kibana_url';
import { useListKi } from '../hooks/use_list_ki';
import { useMemoryEnabled } from '../hooks/use_memory_enabled';
import { useMemoryCount } from '../hooks/use_memory_count';
import { useNavigation } from '../hooks/use_navigation';
import { useSetupWizard } from '../hooks/use_setup_wizard';
import { getVisibleAutomations, getVisibleWorkflowIds } from '../utils/visible_automations';
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
  getAiIndexSourcesPath,
  getAiIndexKnowledgeDocumentsPath,
  getAiIndexSettingsPath,
} from '../paths';
import type { AiIndexCreatedLocationState } from '../ai_index_created_location_state';

// Flex items don't shrink below their content by default, so a long document title would
// push the chart off screen. With 0, the title truncates instead.
const shrinkableFlexItemStyle = css({ minWidth: 0 });

const managedBadgeLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.managedBadge', {
  defaultMessage: 'Managed',
});

const overviewTabLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.tabs.overview', {
  defaultMessage: 'Overview',
});

const sourcesTabLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.tabs.sources', {
  defaultMessage: 'Sources',
});

const knowledgeIndicatorsTabLabel = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.tabs.knowledgeIndicators',
  {
    defaultMessage: 'Knowledge documents',
  }
);

const settingsTabLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.tabs.settings', {
  defaultMessage: 'Settings',
});

const discoverLinkLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.discoverLink', {
  defaultMessage: 'Open in Discover',
});

export const AiIndexDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation<AiIndexCreatedLocationState | undefined>();
  const history = useHistory<AiIndexCreatedLocationState | undefined>();
  const { aiIndex, isLoading, error, refetch } = useAiIndex(id);
  const { discoverHref, indexManagementHref } = useAiIndexDestLinks(aiIndex?.dest);
  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();
  const isMemoryEnabled = useMemoryEnabled();
  const isSourcesTab =
    useRouteMatch({ path: CONTEXT_ENGINE_PATHS.detailSources, exact: true }) !== null;
  const isKnowledgeIndicatorsTab =
    useRouteMatch({
      path: [
        CONTEXT_ENGINE_PATHS.detailKnowledgeDocuments,
        CONTEXT_ENGINE_PATHS.detailKnowledgeDocument,
      ],
      exact: true,
    }) !== null;
  const isSettingsTab =
    useRouteMatch({ path: CONTEXT_ENGINE_PATHS.detailSettings, exact: true }) !== null;
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

  const {
    summary,
    isLoading: isKiSummaryLoading,
    error: kiSummaryError,
  } = useListKi({
    aiIndexId: aiIndex?.id,
    size: KI_SUMMARY_PAGE_SIZE,
    status: KI_NOT_DELETED_STATUSES,
    enabled: aiIndex !== undefined,
    notifyOnError: true,
  });

  const hasLoadedKiSummary = aiIndex !== undefined && !isKiSummaryLoading;
  const { memoryCount, isLoading: isMemoryCountLoading } = useMemoryCount(aiIndex?.id, {
    enabled: aiIndex !== undefined && isMemoryEnabled,
  });
  const hasKnowledgeIndicators = hasLoadedKiSummary && summary.total > 0;
  const showKnowledgeIndicatorsTabInHeader = isKnowledgeIndicatorsTab || hasKnowledgeIndicators;

  const { hideEditControls, showOnboardingPanel, showAutomationsPanel } =
    useAiIndexOverviewSections({
      aiIndex,
      isLoading,
      hasKnowledgeIndicators,
      isKnowledgeIndicatorsLoading: isKiSummaryLoading,
    });
  const pageTitle = aiIndex?.id ?? id ?? '';
  const backHref = createContextEngineUrl(CONTEXT_ENGINE_PATHS.landing);
  const sources = useMemo(() => aiIndex?.sources ?? [], [aiIndex?.sources]);
  const automations = useMemo(() => aiIndex?.automations ?? [], [aiIndex?.automations]);
  const visibleAutomationsCount = useMemo(
    () => getVisibleAutomations(automations, isMemoryEnabled).length,
    [automations, isMemoryEnabled]
  );
  const visibleWorkflowIds = useMemo(
    () => getVisibleWorkflowIds(automations, isMemoryEnabled),
    [automations, isMemoryEnabled]
  );
  const isManaged = aiIndex?.managed === true;
  const setupWizard = useSetupWizard({
    aiIndex,
    memoryCount,
    isMemoryEnabled,
    isMemoryCountReady: !isMemoryCountLoading,
    isActive: !isSourcesTab && !isKnowledgeIndicatorsTab && !isSettingsTab,
  });
  // The setup wizard replaces the "AI index created" callout.
  const isSetupWizardShown = setupWizard.status === 'shown';
  useEffect(() => {
    if (isSetupWizardShown) {
      setShowCreatedCallout(false);
    }
  }, [isSetupWizardShown]);

  const { kibanaUrl } = useKibanaUrl();
  const onboardingPrompt = useMemo(() => {
    if (!showOnboardingPanel) {
      return '';
    }
    return buildAiIndexOnboardingPrompt({
      aiIndexId: resolvedAiIndexId,
      aiIndexDest: aiIndex?.dest.value ?? '',
      kibanaUrl,
    });
  }, [aiIndex?.dest.value, kibanaUrl, resolvedAiIndexId, showOnboardingPanel]);

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

    if (primaryActionItem === undefined) {
      return undefined;
    }

    return { primaryActionItem };
  }, [aiIndex, discoverHref, isKnowledgeIndicatorsTab]);

  const headerTabs = useMemo<AppHeaderTab[] | undefined>(() => {
    if (error) {
      return undefined;
    }

    const overviewTab: AppHeaderTab = {
      id: 'overview',
      label: overviewTabLabel,
      isSelected: !isSourcesTab && !isKnowledgeIndicatorsTab && !isSettingsTab,
      onClick: () => navigateToContextEngine(getAiIndexDetailPath(resolvedAiIndexId)),
      'data-test-subj': 'contextAiIndexDetailTab-overview',
    };

    const tabs: AppHeaderTab[] = [
      overviewTab,
      {
        id: 'sources',
        label: sourcesTabLabel,
        isSelected: isSourcesTab,
        onClick: () => navigateToContextEngine(getAiIndexSourcesPath(resolvedAiIndexId)),
        badge: sources.length,
        'data-test-subj': 'contextAiIndexDetailTab-sources',
      },
    ];

    if (showKnowledgeIndicatorsTabInHeader) {
      tabs.push({
        id: 'knowledge_indicators',
        label: knowledgeIndicatorsTabLabel,
        isSelected: isKnowledgeIndicatorsTab,
        onClick: () => navigateToContextEngine(getAiIndexKnowledgeDocumentsPath(resolvedAiIndexId)),
        badge: hasKnowledgeIndicators ? summary.total : undefined,
        'data-test-subj': 'contextAiIndexDetailTab-knowledge_indicators',
      });
    }

    tabs.push({
      id: 'settings',
      label: settingsTabLabel,
      isSelected: isSettingsTab,
      onClick: () => navigateToContextEngine(getAiIndexSettingsPath(resolvedAiIndexId)),
      'data-test-subj': 'contextAiIndexDetailTab-settings',
    });

    return tabs;
  }, [
    error,
    hasKnowledgeIndicators,
    isKnowledgeIndicatorsTab,
    isSettingsTab,
    isSourcesTab,
    navigateToContextEngine,
    resolvedAiIndexId,
    showKnowledgeIndicatorsTabInHeader,
    sources.length,
    summary.total,
  ]);

  const sourcesPanel = (
    <SourcesPanel
      isLoading={isLoading}
      aiIndex={aiIndex}
      onSaved={refetch}
      isManaged={hideEditControls}
    />
  );

  const overviewTabContent = (
    <>
      {showCreatedCallout && (
        <AiIndexCreatedCallout
          onDismiss={() => setShowCreatedCallout(false)}
          showMemory={isMemoryEnabled}
        />
      )}
      {aiIndex && !isManaged && <FailedAutomationRunsCallout workflowIds={visibleWorkflowIds} />}
      {showOnboardingPanel && (
        <>
          <ConnectAgentPanel prompt={onboardingPrompt} />
          <EuiSpacer size="l" />
        </>
      )}
      {aiIndex && (
        <>
          <OverviewStatCards
            aiIndexId={aiIndex.id}
            knowledgeDocumentsCount={kiSummaryError ? undefined : summary.total}
            sourcesCount={sources.length}
            automationsCount={visibleAutomationsCount}
            isManaged={isManaged}
            isMemoryEnabled={isMemoryEnabled}
            isLoading={isKiSummaryLoading}
          />
          <EuiSpacer size="l" />
        </>
      )}
      {/* Wait for the summary, so the chart column does not pop in next to Recent documents. */}
      {hasLoadedKiSummary && (
        <>
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem css={shrinkableFlexItemStyle}>
              <RecentKnowledgeDocumentsPanel
                aiIndexId={resolvedAiIndexId}
                isManaged={isManaged}
                isMemoryEnabled={isMemoryEnabled}
              />
            </EuiFlexItem>
            {hasKnowledgeIndicators && (
              <EuiFlexItem css={shrinkableFlexItemStyle}>
                <KnowledgeDocumentsChartPanel aiIndexId={resolvedAiIndexId} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="l" />
        </>
      )}
      <AutomationsSection
        isLoading={isLoading}
        aiIndex={aiIndex}
        aiIndexId={resolvedAiIndexId}
        onSaved={refetch}
        isUnlocked={showAutomationsPanel}
        headerAction={
          hideEditControls ? undefined : <ManageAutomationsLink aiIndexId={resolvedAiIndexId} />
        }
      />
      {aiIndex && !isManaged && (
        <>
          <EuiSpacer size="l" />
          <LearnMorePanel />
        </>
      )}
    </>
  );

  const overviewRouteContent = (() => {
    if (aiIndex && setupWizard.status === 'loading') {
      // Wait for the wizard decision, so the normal Overview doesn't flash first.
      return (
        <EuiFlexGroup justifyContent="center" data-test-subj="contextAiIndexOverviewLoading">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    if (aiIndex && setupWizard.status === 'shown') {
      return (
        <SetupWizard
          key={aiIndex.id}
          aiIndex={aiIndex}
          steps={setupWizard.steps}
          currentStep={setupWizard.currentStep}
          done={setupWizard.done}
          isMemoryEnabled={isMemoryEnabled}
          onStepChange={setupWizard.goToStep}
          onClose={setupWizard.close}
          onSaved={refetch}
        />
      );
    }
    return overviewTabContent;
  })();

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
      <Route path={CONTEXT_ENGINE_PATHS.detailSources} exact>
        {sourcesPanel}
      </Route>
      <Route
        path={[
          CONTEXT_ENGINE_PATHS.detailKnowledgeDocuments,
          CONTEXT_ENGINE_PATHS.detailKnowledgeDocument,
        ]}
        exact
      >
        {aiIndex ? <ListKiPanel aiIndex={aiIndex} discoverHref={discoverHref} /> : null}
      </Route>
      <Route path={CONTEXT_ENGINE_PATHS.detailSettings} exact>
        <SettingsTab
          isLoading={isLoading}
          aiIndex={aiIndex}
          aiIndexId={resolvedAiIndexId}
          onSaved={refetch}
          isAutomationsUnlocked={showAutomationsPanel}
          indexManagementHref={indexManagementHref}
        />
      </Route>
      <Route path={CONTEXT_ENGINE_PATHS.detail} exact>
        {overviewRouteContent}
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
        description={aiIndex?.description || undefined}
        menu={headerMenu}
        badges={headerBadges}
        tabs={headerTabs}
      />
      <ContextEnginePageSection>{pageContent}</ContextEnginePageSection>
    </ContextEnginePageTemplate>
  );
};
