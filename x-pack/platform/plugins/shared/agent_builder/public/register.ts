/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters } from '@kbn/core-application-browser';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import type { CoreSetup } from '@kbn/core-lifecycle-browser';
import type { AnalyticsServiceSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { agentBuilderPublicEbtEvents } from '@kbn/agent-builder-common/telemetry';
import {
  AGENT_BUILDER_FULL_TITLE,
  AGENT_BUILDER_SHORT_TITLE,
  AGENTBUILDER_APP_ID,
  AGENTBUILDER_PATH,
} from '../common/features';
import type { AgentBuilderInternalService } from './services';
import type { AgentBuilderStartDependencies } from './types';

export const registerApp = ({
  core,
  getServices,
}: {
  core: CoreSetup<AgentBuilderStartDependencies>;
  getServices: () => AgentBuilderInternalService;
}) => {
  core.application.register({
    id: AGENTBUILDER_APP_ID,
    appRoute: AGENTBUILDER_PATH,
    category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
    title: AGENT_BUILDER_SHORT_TITLE,
    euiIconType: 'logoElasticsearch',
    visibleIn: ['sideNav', 'globalSearch'],
    keywords: ['agent builder', 'ai agent', 'chat agent'],
    deepLinks: [
      {
        id: 'conversations',
        path: '/conversations',
        title: i18n.translate('xpack.agentBuilder.chat.conversationsTitle', {
          defaultMessage: 'Agent Chat',
        }),
      },
      {
        id: 'tools',
        path: '/tools',
        title: i18n.translate('xpack.agentBuilder.tools.title', { defaultMessage: 'Tools' }),
        keywords: ['mcp'],
      },
      {
        id: 'agents',
        path: '/agents',
        title: i18n.translate('xpack.agentBuilder.agents.title', { defaultMessage: 'Agents' }),
      },
    ],
    async mount({ element, history, onAppLeave }: AppMountParameters) {
      const { mountApp } = await import('./application');
      const [coreStart, startDependencies] = await core.getStartServices();

      coreStart.chrome.docTitle.change(AGENT_BUILDER_FULL_TITLE);
      const services = getServices();

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
