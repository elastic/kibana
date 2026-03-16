/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { matchPath } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

import { RouteDisplay } from './components/common/route_display';

export type SidebarView = 'conversation' | 'agentSettings' | 'manage';

export interface RouteDefinition {
  path: string;
  element: React.ReactNode;
  sidebarView: SidebarView;
  isExperimental?: boolean;
  navLabel?: string;
}

const navLabels = {
  instructions: i18n.translate('xpack.agentBuilder.routeConfig.instructions', {
    defaultMessage: 'Instructions',
  }),
  skills: i18n.translate('xpack.agentBuilder.routeConfig.skills', {
    defaultMessage: 'Skills',
  }),
  tools: i18n.translate('xpack.agentBuilder.routeConfig.tools', {
    defaultMessage: 'Tools',
  }),
  plugins: i18n.translate('xpack.agentBuilder.routeConfig.plugins', {
    defaultMessage: 'Plugins',
  }),
  connectors: i18n.translate('xpack.agentBuilder.routeConfig.connectors', {
    defaultMessage: 'Connectors',
  }),
  agents: i18n.translate('xpack.agentBuilder.routeConfig.agents', {
    defaultMessage: 'Agents',
  }),
};

// Routes ordered from most specific to least specific for correct matching
export const agentRoutes: RouteDefinition[] = [
  {
    path: '/agents/:agentId/conversations/:conversationId',
    sidebarView: 'conversation',
    element: <RouteDisplay />,
  },
  {
    path: '/agents/:agentId/instructions',
    sidebarView: 'agentSettings',
    navLabel: navLabels.instructions,
    element: <RouteDisplay />,
  },
  {
    path: '/agents/:agentId/skills',
    sidebarView: 'agentSettings',
    navLabel: navLabels.skills,
    element: <RouteDisplay />,
  },
  {
    path: '/agents/:agentId/plugins',
    sidebarView: 'agentSettings',
    navLabel: navLabels.plugins,
    element: <RouteDisplay />,
  },
  {
    path: '/agents/:agentId/connectors',
    sidebarView: 'agentSettings',
    navLabel: navLabels.connectors,
    element: <RouteDisplay />,
  },
  // Catch-all for agent root - must be last
  {
    path: '/agents/:agentId',
    sidebarView: 'conversation',
    element: <RouteDisplay />,
  },
];

export const manageRoutes: RouteDefinition[] = [
  {
    path: '/manage/agents',
    sidebarView: 'manage',
    navLabel: navLabels.agents,
    element: <RouteDisplay />,
  },
  {
    path: '/manage/agents/new',
    sidebarView: 'manage',
    element: <RouteDisplay />,
  },
  {
    path: '/manage/tools',
    sidebarView: 'manage',
    navLabel: navLabels.tools,
    element: <RouteDisplay />,
  },
  {
    path: '/manage/tools/new',
    sidebarView: 'manage',
    element: <RouteDisplay />,
  },
  {
    path: '/manage/tools/bulk_import_mcp',
    sidebarView: 'manage',
    element: <RouteDisplay />,
  },
  {
    path: '/manage/tools/:toolId',
    sidebarView: 'manage',
    element: <RouteDisplay />,
  },
  {
    path: '/manage/skills',
    sidebarView: 'manage',
    navLabel: navLabels.skills,
    isExperimental: true,
    element: <RouteDisplay />,
  },
  {
    path: '/manage/skills/new',
    sidebarView: 'manage',
    isExperimental: true,
    element: <RouteDisplay />,
  },
  {
    path: '/manage/skills/:skillId',
    sidebarView: 'manage',
    isExperimental: true,
    element: <RouteDisplay />,
  },
  {
    path: '/manage/plugins',
    sidebarView: 'manage',
    navLabel: navLabels.plugins,
    element: <RouteDisplay />,
  },
  {
    path: '/manage/plugins/:pluginId',
    sidebarView: 'manage',
    element: <RouteDisplay />,
  },
  {
    path: '/manage/connectors',
    sidebarView: 'manage',
    navLabel: navLabels.connectors,
    element: <RouteDisplay />,
  },
];

export const allRoutes: RouteDefinition[] = [...agentRoutes, ...manageRoutes];

export const getSidebarViewForRoute = (pathname: string): SidebarView => {
  for (const route of allRoutes) {
    if (matchPath(pathname, { path: route.path, exact: false })) {
      return route.sidebarView;
    }
  }
  return 'conversation';
};

export const getAgentIdFromPath = (pathname: string): string | undefined => {
  const match = pathname.match(/^\/agents\/([^/]+)/);
  return match ? match[1] : undefined;
};

export const getAgentSettingsNavItems = (
  agentId: string
): Array<{ label: string; path: string }> => {
  return agentRoutes
    .filter((route) => route.navLabel && route.sidebarView === 'agentSettings')
    .map((route) => ({
      label: route.navLabel!,
      path: route.path.replace(':agentId', agentId),
    }));
};

export const getManageNavItems = (): Array<{
  label: string;
  path: string;
  isExperimental?: boolean;
}> => {
  return manageRoutes
    .filter((route) => route.navLabel)
    .map((route) => ({
      label: route.navLabel!,
      path: route.path,
      isExperimental: route.isExperimental,
    }));
};
