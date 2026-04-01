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
import { AgentBuilderConversationsPage } from './pages/conversations';
import { AgentBuilderAgentsPage } from './pages/agents';
import { AgentBuilderAgentsCreate } from './pages/agent_create';
import { AgentBuilderAgentsEdit } from './pages/agent_edit';
import { AgentBuilderAgentOverviewPage } from './pages/agent_overview';
import { AgentBuilderAgentSkillsPage } from './pages/agent_skills';
import { AgentBuilderAgentPluginsPage } from './pages/agent_plugins';
import { AgentBuilderAgentToolsPage } from './pages/agent_tools';
import { AgentBuilderToolsPage } from './pages/tools';
import { AgentBuilderToolCreatePage } from './pages/tool_create';
import { AgentBuilderToolDetailsPage } from './pages/tool_details';
import { AgentBuilderBulkImportMcpToolsPage } from './pages/bulk_import_mcp_tools';
import { AgentBuilderSkillsPage } from './pages/skills';
import { AgentBuilderSkillCreatePage } from './pages/skill_create';
import { AgentBuilderSkillDetailsPage } from './pages/skill_details';
import { AgentBuilderPluginsPage } from './pages/plugins';
import { AgentBuilderPluginDetailsPage } from './pages/plugin_details';
import { AgentBuilderConnectorsPage } from './pages/connectors';

export type SidebarView = 'conversation' | 'manage';

export interface FeatureFlags {
  experimental: boolean;
  connectors: boolean;
}

export interface RouteDefinition {
  path: string;
  element: React.ReactNode;
  sidebarView: SidebarView;
  isExperimental?: boolean;
  isConnectors?: boolean;
  navLabel?: string;
  navIcon?: string;
}

const navLabels = {
  overview: i18n.translate('xpack.agentBuilder.routeConfig.overview', {
    defaultMessage: 'Overview',
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
    element: <AgentBuilderConversationsPage />,
  },
  {
    path: '/agents/:agentId/overview',
    sidebarView: 'conversation',
    navLabel: navLabels.overview,
    element: <AgentBuilderAgentOverviewPage />,
  },
  {
    path: '/agents/:agentId/skills',
    sidebarView: 'conversation',
    navLabel: navLabels.skills,
    element: <AgentBuilderAgentSkillsPage />,
  },
  {
    path: '/agents/:agentId/plugins',
    sidebarView: 'conversation',
    isExperimental: true,
    navLabel: navLabels.plugins,
    element: <AgentBuilderAgentPluginsPage />,
  },
  {
    path: '/agents/:agentId/connectors',
    sidebarView: 'conversation',
    navLabel: navLabels.connectors,
    isConnectors: true,
    element: <RouteDisplay />,
  },
  {
    path: '/agents/:agentId/tools',
    sidebarView: 'conversation',
    navLabel: navLabels.tools,
    element: <AgentBuilderAgentToolsPage />,
  },
  // Catch-all for agent root - must be last
  {
    path: '/agents/:agentId',
    sidebarView: 'conversation',
    element: <AgentBuilderConversationsPage />,
  },
];

export const manageRoutes: RouteDefinition[] = [
  {
    path: '/manage/agents',
    sidebarView: 'manage',
    navLabel: navLabels.agents,
    element: <AgentBuilderAgentsPage />,
  },
  {
    path: '/manage/agents/new',
    sidebarView: 'manage',
    element: <AgentBuilderAgentsCreate />,
  },
  {
    path: '/manage/agents/:agentId',
    sidebarView: 'manage',
    element: <AgentBuilderAgentsEdit />,
  },
  {
    path: '/manage/skills',
    sidebarView: 'manage',
    navLabel: navLabels.skills,
    element: <AgentBuilderSkillsPage />,
  },
  {
    path: '/manage/skills/new',
    sidebarView: 'manage',
    element: <AgentBuilderSkillCreatePage />,
  },
  {
    path: '/manage/skills/:skillId',
    sidebarView: 'manage',
    element: <AgentBuilderSkillDetailsPage />,
  },
  {
    path: '/manage/plugins',
    sidebarView: 'manage',
    isExperimental: true,
    navLabel: navLabels.plugins,
    element: <AgentBuilderPluginsPage />,
  },
  {
    path: '/manage/plugins/:pluginId',
    sidebarView: 'manage',
    isExperimental: true,
    element: <AgentBuilderPluginDetailsPage />,
  },
  {
    path: '/manage/connectors',
    sidebarView: 'manage',
    navLabel: navLabels.connectors,
    isConnectors: true,
    element: <AgentBuilderConnectorsPage />,
  },
  {
    path: '/manage/tools',
    sidebarView: 'manage',
    navLabel: navLabels.tools,
    element: <AgentBuilderToolsPage />,
  },
  {
    path: '/manage/tools/new',
    sidebarView: 'manage',
    element: <AgentBuilderToolCreatePage />,
  },
  {
    path: '/manage/tools/bulk_import_mcp',
    sidebarView: 'manage',
    element: <AgentBuilderBulkImportMcpToolsPage />,
  },
  {
    path: '/manage/tools/:toolId',
    sidebarView: 'manage',
    element: <AgentBuilderToolDetailsPage />,
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

export const getConversationIdFromPath = (pathname: string): string | undefined => {
  const match = pathname.match(/^\/agents\/[^/]+\/conversations\/([^/]+)/);
  return match ? match[1] : undefined;
};

export interface SidebarNavItem {
  label: string;
  path: string;
  icon?: string;
}

const isRouteEnabled = (route: RouteDefinition, flags: FeatureFlags): boolean => {
  if (route.isExperimental && !flags.experimental) return false;
  if (route.isConnectors && !flags.connectors) return false;
  return true;
};

export const getEnabledRoutes = (flags: FeatureFlags): RouteDefinition[] => {
  return allRoutes.filter((route) => isRouteEnabled(route, flags));
};

export const getAgentSettingsNavItems = (
  agentId: string,
  flags: FeatureFlags
): SidebarNavItem[] => {
  return agentRoutes
    .filter((route) => route.navLabel && isRouteEnabled(route, flags))
    .map((route) => ({
      label: route.navLabel ?? '',
      path: route.path.replace(':agentId', agentId),
      icon: route.navIcon,
    }));
};

export const getManageNavItems = (flags: FeatureFlags): SidebarNavItem[] => {
  return manageRoutes
    .filter((route) => route.navLabel && isRouteEnabled(route, flags))
    .map((route) => ({
      label: route.navLabel!,
      path: route.path,
      icon: route.navIcon,
    }));
};
