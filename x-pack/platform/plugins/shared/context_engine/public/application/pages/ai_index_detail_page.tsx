/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import type { AppHeaderBadge, AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import type { AiIndexCreatedLocationState } from '../ai_index_created_location_state';
import { KI_SUMMARY_PAGE_SIZE } from '../../../common/constants';
import {
  AiIndexCreatedCallout,
  AutomationsPanel,
  DescriptionPanel,
  LockedSectionPanel,
  MemoryPanel,
  SignalsPanel,
  SourcesPanel,
  TracesPanel,
} from '../components/ai_index_detail';
import { KiListPanel } from '../components/ki';
import { useAiIndex } from '../hooks/use_ai_index';
import { useAiIndexOverviewSections } from '../hooks/use_ai_index_overview_sections';
import { useKiList } from '../hooks/use_ki_list';
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
import { CONTEXT_ENGINE_PATHS } from '../paths';

type DetailTabId = 'overview' | 'knowledge_indicators';

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
  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();
  const isMemoryEnabled = useMemoryEnabled();
  const [selectedTab, setSelectedTab] = useState<DetailTabId>('overview');
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

  const { summary, isLoading: isKiSummaryLoading } = useKiList({
    aiIndexId: aiIndex?.id,
    size: KI_SUMMARY_PAGE_SIZE,
    enabled: aiIndex !== undefined,
    notifyOnError: true,
  });

  const showKnowledgeIndicatorsTab =
    aiIndex !== undefined && !isKiSummaryLoading && summary.total > 0;

  const { hideEditControls, showAutomationsPanel, showSignalsSection, showSignalsPanel } =
    useAiIndexOverviewSections({
      aiIndex,
      isLoading,
    });
  const pageTitle = aiIndex?.id ?? id ?? '';
  const backHref = createContextEngineUrl(CONTEXT_ENGINE_PATHS.landing);

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

  const headerTabs = useMemo<AppHeaderTab[] | undefined>(() => {
    if (error) {
      return undefined;
    }

    const overviewTab: AppHeaderTab = {
      id: 'overview',
      label: overviewTabLabel,
      isSelected: showKnowledgeIndicatorsTab ? selectedTab === 'overview' : true,
      onClick: () => setSelectedTab('overview'),
      'data-test-subj': 'contextAiIndexDetailTab-overview',
    };

    if (!showKnowledgeIndicatorsTab) {
      return [overviewTab];
    }

    return [
      overviewTab,
      {
        id: 'knowledge_indicators',
        label: knowledgeIndicatorsTabLabel,
        isSelected: selectedTab === 'knowledge_indicators',
        onClick: () => setSelectedTab('knowledge_indicators'),
        badge: summary.total,
        'data-test-subj': 'contextAiIndexDetailTab-knowledge_indicators',
      },
    ];
  }, [error, selectedTab, showKnowledgeIndicatorsTab, summary.total]);

  useEffect(() => {
    if (!showKnowledgeIndicatorsTab && selectedTab === 'knowledge_indicators') {
      setSelectedTab('overview');
    }
  }, [showKnowledgeIndicatorsTab, selectedTab]);

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
      {(selectedTab === 'overview' || !showKnowledgeIndicatorsTab) && (
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
          <TracesPanel
            isLoading={isLoading}
            aiIndex={aiIndex}
            onSaved={refetch}
            isManaged={!!aiIndex?.managed}
          />
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
      )}

      {selectedTab === 'knowledge_indicators' && showKnowledgeIndicatorsTab && aiIndex && (
        <KiListPanel aiIndex={aiIndex} />
      )}
    </>
  );

  return (
    <ContextEnginePageTemplate
      data-test-subj="contextAiIndexDetailPage"
      breadcrumbPageName={pageTitle || undefined}
    >
      <ContextEngineSubPageHeader
        backDestinationLabel={contextEngineBackDestinationLabel}
        backHref={backHref}
        onBackClick={(event) => {
          event.preventDefault();
          navigateToContextEngine(CONTEXT_ENGINE_PATHS.landing);
        }}
        pageTitle={pageTitle}
        badges={headerBadges}
        tabs={headerTabs}
      />
      <ContextEnginePageSection>{pageContent}</ContextEnginePageSection>
    </ContextEnginePageTemplate>
  );
};
