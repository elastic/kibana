/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingElastic } from '@elastic/eui';
import type { AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo } from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { getFormattedError } from '../../../util/errors';
import { useStreamsAppBreadcrumbs } from '../../../hooks/use_streams_app_breadcrumbs';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../../hooks/use_streams_privileges';
import { useSignificantEventsAvailability } from '../../../hooks/significant_events/use_significant_events_availability';
import { RedirectTo } from '../../redirect_to';
import { SignificantEventsNotEnabledPrompt } from '../significant_events_not_enabled_prompt';
import { StreamsAppHeader, StreamsAppPageTemplate } from '../../streams_app_page_template';
import {
  KnowledgeIndicatorsTable,
  KiGenerationProvider,
} from './components/knowledge_indicators_table';
import { SignificantEventsDiscoveryProvider } from './context/significant_events_discovery_context';
import { ONBOARDING_FAILURE_TITLE } from './components/streams_view/translations';
import { QueriesTable } from './components/queries_table/queries_table';
import { StreamsView } from './components/streams_view/streams_view';
import { SettingsTab } from './components/settings/tab';
import { MemoryTab } from './components/memory/tab';
import { DetectionsTab } from './components/detections_tab';
import { DiscoveriesTab } from './components/discoveries_tab';
import { SigEventsTab } from './components/significant_events_tab';

const discoveryTabs = [
  'streams',
  'knowledge_indicators',
  'queries',
  'detections',
  'discoveries',
  'significant_events',
  'memory',
  'settings',
] as const;
type DiscoveryTab = (typeof discoveryTabs)[number];

function isValidDiscoveryTab(value: string): value is DiscoveryTab {
  return discoveryTabs.includes(value as DiscoveryTab);
}

export function SignificantEventsDiscoveryPage() {
  const {
    path: { tab },
  } = useStreamsAppParams('/_discovery/{tab}');

  const router = useStreamsAppRouter();
  const {
    core: {
      application: { getUrlForApp },
      notifications: { toasts },
    },
    dependencies: {
      start: { agentBuilder },
    },
  } = useKibana();

  const {
    features: { significantEvents },
  } = useStreamsPrivileges();

  const { availability, isLoading: isAvailabilityLoading } = useSignificantEventsAvailability();

  const onOnboardingFailed = useCallback(
    (error: string) => {
      toasts.addError(getFormattedError(new Error(error)), {
        title: ONBOARDING_FAILURE_TITLE,
      });
    },
    [toasts]
  );

  const pageTitle = i18n.translate('xpack.streams.significantEventsDiscovery.pageHeaderTitle', {
    defaultMessage: 'Significant Events',
  });

  const nightshiftLabel = i18n.translate(
    'xpack.streams.significantEventsDiscovery.nightshiftButtonLabel',
    { defaultMessage: 'Nightshift' }
  );

  const systemOnboardingLabel = i18n.translate(
    'xpack.streams.significantEventsDiscovery.systemOnboardingButton',
    { defaultMessage: 'Tell us about your system' }
  );

  const handleOpenSystemOnboarding = useCallback(() => {
    agentBuilder?.openChat({
      newConversation: true,
      initialMessage: i18n.translate(
        'xpack.streams.significantEventsDiscovery.onboardingInitialMessage',
        {
          defaultMessage:
            'Start the significant-events-onboarding skill. First check whether there is already memory about my system. If there is, summarise what you know and ask whether I have something specific to add or correct, or whether I want a general review of the gaps. If memory is empty, go straight into gathering information.',
        }
      ),
      autoSendInitialMessage: true,
    });
  }, [agentBuilder]);

  const menu = useMemo<AppHeaderMenu>(() => {
    const items: NonNullable<AppHeaderMenu['items']> = [
      {
        id: 'nightshift',
        order: 1,
        label: nightshiftLabel,
        iconType: 'moon',
        href: getUrlForApp('observability', { path: '/nightshift' }),
      },
    ];

    if (agentBuilder) {
      items.push({
        id: 'significantEventsSystemOnboarding',
        order: 2,
        label: systemOnboardingLabel,
        iconType: 'sparkles',
        run: handleOpenSystemOnboarding,
        testId: 'significantEventsSystemOnboardingButton',
      });
    }

    return { items };
  }, [
    agentBuilder,
    getUrlForApp,
    handleOpenSystemOnboarding,
    nightshiftLabel,
    systemOnboardingLabel,
  ]);

  useStreamsAppBreadcrumbs(() => {
    return [
      {
        title: i18n.translate('xpack.streams.significantEventsDiscovery.breadcrumbTitle', {
          defaultMessage: 'Significant Events',
        }),
        path: '/_discovery',
      },
    ];
  }, []);

  const tabs = useMemo(
    () => [
      {
        id: 'streams',
        label: i18n.translate('xpack.streams.significantEventsDiscovery.streamsTab', {
          defaultMessage: 'Streams',
        }),
        href: router.link('/_discovery/{tab}', { path: { tab: 'streams' } }),
        isSelected: tab === 'streams',
      },
      {
        id: 'knowledge_indicators',
        label: i18n.translate('xpack.streams.significantEventsDiscovery.knowledgeIndicatorsTab', {
          defaultMessage: 'Knowledge Indicators',
        }),
        href: router.link('/_discovery/{tab}', { path: { tab: 'knowledge_indicators' } }),
        isSelected: tab === 'knowledge_indicators',
      },
      {
        id: 'queries',
        label: i18n.translate('xpack.streams.significantEventsDiscovery.queriesTab', {
          defaultMessage: 'Rules',
        }),
        href: router.link('/_discovery/{tab}', { path: { tab: 'queries' } }),
        isSelected: tab === 'queries',
      },

      {
        id: 'detections',
        label: i18n.translate('xpack.streams.significantEventsDiscovery.detectionsTab', {
          defaultMessage: 'Detections',
        }),
        href: router.link('/_discovery/{tab}', { path: { tab: 'detections' } }),
        isSelected: tab === 'detections',
      },
      {
        id: 'discoveries',
        label: i18n.translate('xpack.streams.significantEventsDiscovery.discoveriesTab', {
          defaultMessage: 'Discoveries',
        }),
        href: router.link('/_discovery/{tab}', { path: { tab: 'discoveries' } }),
        isSelected: tab === 'discoveries',
      },
      {
        id: 'significant_events',
        label: i18n.translate('xpack.streams.significantEventsDiscovery.significantEventsTab', {
          defaultMessage: 'Significant Events',
        }),
        href: router.link('/_discovery/{tab}', { path: { tab: 'significant_events' } }),
        isSelected: tab === 'significant_events',
      },
      {
        id: 'memory',
        label: i18n.translate('xpack.streams.significantEventsDiscovery.memoryTab', {
          defaultMessage: 'Memory',
        }),
        href: router.link('/_discovery/{tab}', { path: { tab: 'memory' } }),
        isSelected: tab === 'memory',
      },
      {
        id: 'settings',
        label: i18n.translate('xpack.streams.significantEventsDiscovery.settingsTab', {
          defaultMessage: 'Settings',
        }),
        href: router.link('/_discovery/{tab}', { path: { tab: 'settings' } }),
        isSelected: tab === 'settings',
      },
    ],
    [tab, router]
  );

  if (significantEvents === undefined || isAvailabilityLoading) {
    // Waiting to load license / availability
    return <EuiLoadingElastic size="xxl" />;
  }

  if (!significantEvents.available) {
    return <RedirectTo path="/" />;
  }

  if (availability && !availability.available) {
    return (
      <StreamsAppPageTemplate.Body grow>
        <SignificantEventsNotEnabledPrompt reason={availability.reason} />
      </StreamsAppPageTemplate.Body>
    );
  }

  if (!isValidDiscoveryTab(tab)) {
    return <RedirectTo path="/_discovery/{tab}" params={{ path: { tab: 'streams' } }} />;
  }

  return (
    <>
      <StreamsAppHeader title={pageTitle} menu={menu} tabs={tabs} />
      <KiGenerationProvider onFailed={onOnboardingFailed}>
        <SignificantEventsDiscoveryProvider>
          <StreamsAppPageTemplate.Body grow>
            {tab === 'streams' && <StreamsView />}
            {tab === 'knowledge_indicators' && <KnowledgeIndicatorsTable />}
            {tab === 'queries' && <QueriesTable />}
            {tab === 'detections' && <DetectionsTab />}
            {tab === 'discoveries' && <DiscoveriesTab />}
            {tab === 'significant_events' && <SigEventsTab />}
            {tab === 'memory' && <MemoryTab />}
            {tab === 'settings' && <SettingsTab />}
          </StreamsAppPageTemplate.Body>
        </SignificantEventsDiscoveryProvider>
      </KiGenerationProvider>
    </>
  );
}
