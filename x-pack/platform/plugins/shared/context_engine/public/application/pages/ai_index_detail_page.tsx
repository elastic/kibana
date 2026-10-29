/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiSpacer, useEuiTheme, useIsWithinMaxBreakpoint } from '@elastic/eui';
import { css } from '@emotion/react';
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
  KiGraphPanel,
  LockedSectionPanel,
  MemoryPanel,
  SignalsPanel,
  SourcesPanel,
  TracesPanel,
} from '../components/ai_index_detail';
import { ListKiPanel } from '../components/ki';
import { PanelBackdropProvider } from '../components/panel_backdrop';
import { useAiIndex } from '../hooks/use_ai_index';
import { useAiIndexDestLinks } from '../hooks/use_ai_index_dest_links';
import { useAiIndexOverviewSections } from '../hooks/use_ai_index_overview_sections';
import { useContextEngineBreadcrumbs } from '../hooks/use_context_engine_breadcrumbs';
import { useListKi } from '../hooks/use_list_ki';
import { useMemoryEnabled } from '../hooks/use_memory_enabled';
import { useNavigation } from '../hooks/use_navigation';
import { useStickyFrame } from '../hooks/use_sticky_frame';
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

/**
 * How far into the overlap with the panels the overview graph frames its map: the map runs behind
 * the panels rather than shrinking into the uncovered right third.
 */
const OVERVIEW_GRAPH_OVERLAP_COVERED = 0.75;
const OVERVIEW_GRAPH_MIN_HEIGHT = 480;

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

  const { euiTheme } = useEuiTheme();
  const isStacked = useIsWithinMaxBreakpoint('l');
  const [overviewGrid, setOverviewGrid] = useState<HTMLDivElement | null>(null);
  const graphFrame = useStickyFrame(overviewGrid, {
    minHeight: OVERVIEW_GRAPH_MIN_HEIGHT,
    bottomGap: euiTheme.base,
  });
  // The panels cover the first third of the grid, which is the graph's left edge.
  const graphCoveredRatio = graphFrame
    ? ((graphFrame.width / 3) * OVERVIEW_GRAPH_OVERLAP_COVERED) /
      ((graphFrame.width * 2) / 3 + graphFrame.rightGap)
    : 0;
  const stackedQuery = `@media (max-width: ${euiTheme.breakpoint.l - 1}px)`;
  const overviewGridCss = css`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: start;
    ${stackedQuery} {
      grid-template-columns: minmax(0, 1fr);
    }
  `;
  // Over the graph (positioned and later in the DOM), but only the panels themselves take the
  // pointer: the gaps between them let it through to the graph.
  const overviewPanelsCss = css`
    grid-column: 1 / span 2;
    grid-row: 1;
    position: relative;
    pointer-events: none;
    & > * {
      pointer-events: auto;
    }
    ${stackedQuery} {
      grid-column: 1;
    }
  `;
  const overviewGraphCss = css`
    grid-column: 2 / span 2;
    grid-row: 1;
    position: sticky;
    top: ${graphFrame?.top ?? 0}px;
    height: ${graphFrame?.height ?? OVERVIEW_GRAPH_MIN_HEIGHT}px;
    /* Out to the edge of the app, past the page's width limit. */
    margin-right: -${graphFrame?.rightGap ?? 0}px;
    ${stackedQuery} {
      grid-column: 1;
      grid-row: 2;
      position: relative;
      top: auto;
      height: ${OVERVIEW_GRAPH_MIN_HEIGHT}px;
      margin-right: 0;
    }
  `;

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

  const overviewPanels = (
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
      {/* Only on memory indices, where trace memory extraction reads them: on other indices a
          configured trace breaks Suggest automation, which cannot load the traces skill. */}
      {isMemoryEnabled && aiIndex?.memory_enabled === true && (
        <>
          <EuiSpacer size="m" />
          <TracesPanel
            isLoading={isLoading}
            aiIndex={aiIndex}
            onSaved={refetch}
            isManaged={!!aiIndex?.managed}
          />
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

  // With KIs to show, the graph sits behind the right of the overview: the panels take the left
  // two thirds, the graph the right two thirds, overlapping in the middle.
  const showOverviewGraph = aiIndex !== undefined && hasKnowledgeIndicators;
  const overviewTabContent =
    showOverviewGraph && aiIndex ? (
      <div
        css={overviewGridCss}
        ref={setOverviewGrid}
        data-test-subj="contextAiIndexOverviewWithGraph"
      >
        <div css={overviewGraphCss}>
          <KiGraphPanel aiIndex={aiIndex} leftInsetRatio={isStacked ? 0 : graphCoveredRatio} />
        </div>
        <div css={overviewPanelsCss}>
          <PanelBackdropProvider value={true}>{overviewPanels}</PanelBackdropProvider>
        </div>
      </div>
    ) : (
      overviewPanels
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
