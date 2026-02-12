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
import { agentBuilderPublicEbtEvents } from '@kbn/onechat-common/telemetry';
import {
  AGENT_BUILDER_FULL_TITLE,
  AGENT_BUILDER_SHORT_TITLE,
  ONECHAT_APP_ID,
  ONECHAT_PATH,
} from '../common/features';
import type { OnechatInternalService } from './services';
import type { OnechatStartDependencies } from './types';

export const registerApp = ({
  core,
  getServices,
}: {
  core: CoreSetup<OnechatStartDependencies>;
  getServices: () => OnechatInternalService;
}) => {
  core.application.register({
    id: ONECHAT_APP_ID,
    appRoute: ONECHAT_PATH,
    category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
    title: AGENT_BUILDER_SHORT_TITLE,
    euiIconType: 'logoElasticsearch',
    visibleIn: ['sideNav', 'globalSearch'],
    keywords: ['agent builder', 'ai agent', 'chat agent'],
    deepLinks: [
      {
        id: 'conversations',
        path: '/conversations',
        title: i18n.translate('xpack.onechat.chat.conversationsTitle', {
          defaultMessage: 'Agent Chat',
        }),
      },
      {
        id: 'tools',
        path: '/tools',
        title: i18n.translate('xpack.onechat.tools.title', { defaultMessage: 'Tools' }),
        keywords: ['mcp'],
      },
      {
        id: 'agents',
        path: '/agents',
        title: i18n.translate('xpack.onechat.agents.title', { defaultMessage: 'Agents' }),
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
