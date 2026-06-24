/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLink, AppMountParameters, AppUpdatableFields } from '@kbn/core-application-browser';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import type { CoreSetup } from '@kbn/core-lifecycle-browser';
import type { AnalyticsServiceSetup, AppUpdater } from '@kbn/core/public';
import { isAgentFirst, isNextChrome } from '@kbn/core-chrome-feature-flags';
import { i18n } from '@kbn/i18n';
import type { BehaviorSubject } from 'rxjs';
import { agentBuilderPublicEbtEvents } from '@kbn/agent-builder-common/telemetry';
import {
  AGENT_BUILDER_FULL_TITLE,
  AGENT_BUILDER_SHORT_TITLE,
  AGENTBUILDER_APP_ID,
  AGENTBUILDER_PATH,
} from '../common/features';
import { requestAgentWorkspaceNavigation } from './agent_workspace/agent_workspace_navigation';
import type { AgentBuilderInternalService } from './services';
import type { AgentBuilderStartDependencies } from './types';

const DISCOVER_APP_ID = 'discover';

type AgentBuilderDeepLinkSource = AppDeepLink & { readonly isExperimental?: boolean };

const AGENT_BUILDER_DEEP_LINK_SOURCES: readonly AgentBuilderDeepLinkSource[] = [
  {
    id: 'agents',
    path: '/manage/agents',
    title: i18n.translate('xpack.agentBuilder.agents.title', { defaultMessage: 'Agents' }),
  },
  {
    id: 'skills',
    path: '/manage/skills',
    title: i18n.translate('xpack.agentBuilder.skills.title', { defaultMessage: 'Skills' }),
  },
  {
    id: 'plugins',
    path: '/manage/plugins',
    title: i18n.translate('xpack.agentBuilder.plugins.title', { defaultMessage: 'Plugins' }),
    isExperimental: true,
  },
  {
    id: 'connectors',
    path: '/manage/connectors',
    title: i18n.translate('xpack.agentBuilder.connectors.title', {
      defaultMessage: 'Connectors',
    }),
    isExperimental: true,
  },
  {
    id: 'tools',
    path: '/manage/tools',
    title: i18n.translate('xpack.agentBuilder.tools.title', { defaultMessage: 'Tools' }),
    keywords: ['mcp'],
  },
];

export const buildAgentBuilderDeepLinks = (experimentalFeaturesEnabled: boolean): AppDeepLink[] =>
  AGENT_BUILDER_DEEP_LINK_SOURCES.filter(
    (link) => !link.isExperimental || experimentalFeaturesEnabled
  ).map(({ isExperimental: _isExperimental, ...deepLink }) => deepLink);

export const buildAgentBuilderAppUpdate = ({
  experimentalFeaturesEnabled,
  isAgentFirstChrome,
}: {
  experimentalFeaturesEnabled: boolean;
  isAgentFirstChrome: boolean;
}): Partial<AppUpdatableFields> => ({
  deepLinks: buildAgentBuilderDeepLinks(experimentalFeaturesEnabled),
  ...(isAgentFirstChrome ? { visibleIn: [] } : {}),
});

export const registerApp = ({
  core,
  getServices,
  appUpdater$,
}: {
  core: CoreSetup<AgentBuilderStartDependencies>;
  getServices: () => AgentBuilderInternalService;
  appUpdater$: BehaviorSubject<AppUpdater>;
}) => {
  core.application.register({
    id: AGENTBUILDER_APP_ID,
    appRoute: AGENTBUILDER_PATH,
    category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
    title: AGENT_BUILDER_SHORT_TITLE,
    euiIconType: 'logoElasticsearch',
    visibleIn: ['classicSideNav', 'projectSideNav', 'globalSearch'],
    keywords: ['agent builder', 'ai agent', 'chat agent'],
    updater$: appUpdater$,
    deepLinks: buildAgentBuilderDeepLinks(false),
    defaultPath: '/agents',
    async mount({ element, history, onAppLeave }: AppMountParameters) {
      const [coreStart, startDependencies] = await core.getStartServices();
      const isAgentFirstChrome =
        isAgentFirst(coreStart.featureFlags) && isNextChrome(coreStart.featureFlags);

      if (isAgentFirstChrome) {
        const inAppPath = `${history.location.pathname}${history.location.search ?? ''}`;
        requestAgentWorkspaceNavigation(inAppPath, history.location.state);

        await coreStart.application.navigateToApp(DISCOVER_APP_ID);

        return () => {};
      }

      coreStart.chrome.docTitle.change(AGENT_BUILDER_FULL_TITLE);
      const services = getServices();

      const { mountApp } = await import('./application');

      return mountApp({
        core: coreStart,
        services,
        element,
        history,
        plugins: startDependencies,
        onAppLeave,
      });
    },
  });
};

export const registerAnalytics = ({ analytics }: { analytics: AnalyticsServiceSetup }) => {
  agentBuilderPublicEbtEvents.forEach((eventConfig) => {
    analytics.registerEventType(eventConfig);
  });
};
