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
import { AgentSkills } from './components/agents/skills/agent_skills';
import { AgentBuilderConversationsPage } from './pages/conversations';
import { AgentBuilderAgentsPage } from './pages/agents';
import { AgentBuilderAgentsCreate } from './pages/agent_create';
import { AgentBuilderAgentsEdit } from './pages/agent_edit';
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
import { AgentPlugins } from './components/agents/plugins/agent_plugins';

export type SidebarView = 'conversation' | 'agentSettings' | 'manage';

export interface RouteDefinition {
  path: string;
  element: React.ReactNode;
  sidebarView: SidebarView;
  isExperimental?: boolean;
  isConnectors?: boolean;
  navLabel?: string;
  navIcon?: string;
  navSection?: string;
  isAgentDisplayName?: boolean;
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

const navSections = {
  about: i18n.translate('xpack.agentBuilder.routeConfig.about', {
    defaultMessage: 'About',
  }),
  capabilities: i18n.translate('xpack.agentBuilder.routeConfig.capabilities', {
    defaultMessage: 'Capabilities',
  }),
  advanced: i18n.translate('xpack.agentBuilder.routeConfig.advanced', {
    defaultMessage: 'Advanced',
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
    sidebarView: 'agentSettings',
    navSection: navSections.about,
    navIcon: 'sparkles',
    isAgentDisplayName: true,
    element: <RouteDisplay />,
  },
  {
    path: '/agents/:agentId/skills',
    sidebarView: 'agentSettings',
    navLabel: navLabels.skills,
    navIcon: 'bolt',
    navSection: navSections.capabilities,
    element: <AgentSkills />,
  },
  {
    path: '/agents/:agentId/plugins',
    sidebarView: 'agentSettings',
    navLabel: navLabels.plugins,
    navIcon: 'package',
    navSection: navSections.capabilities,
    element: <AgentPlugins />,
  },
  {
    path: '/agents/:agentId/connectors',
    sidebarView: 'agentSettings',
    navLabel: navLabels.connectors,
    navIcon: 'plugs',
    navSection: navSections.capabilities,
    element: <RouteDisplay />,
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
    navIcon: 'productAgent',
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
    navIcon: 'bolt',
    isExperimental: true,
    element: <AgentBuilderSkillsPage />,
  },
  {
    path: '/manage/skills/new',
    sidebarView: 'manage',
    isExperimental: true,
    element: <AgentBuilderSkillCreatePage />,
  },
  {
    path: '/manage/skills/:skillId',
    sidebarView: 'manage',
    isExperimental: true,
    element: <AgentBuilderSkillDetailsPage />,
  },
  {
    path: '/manage/plugins',
    sidebarView: 'manage',
    navLabel: navLabels.plugins,
    navIcon: 'package',
    element: <AgentBuilderPluginsPage />,
  },
  {
    path: '/manage/plugins/:pluginId',
    sidebarView: 'manage',
    element: <AgentBuilderPluginDetailsPage />,
  },
  {
    path: '/manage/connectors',
    sidebarView: 'manage',
    navLabel: navLabels.connectors,
    navIcon: 'plugs',
    isConnectors: true,
    element: <AgentBuilderConnectorsPage />,
  },
  {
    path: '/manage/tools',
    sidebarView: 'manage',
    navLabel: navLabels.tools,
    navIcon: 'wrench',
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
  section?: string;
  isExperimental?: boolean;
  isConnectors?: boolean;
  isAgentDisplayName?: boolean;
}

export const getAgentSettingsNavItems = (agentId: string): SidebarNavItem[] => {
  return agentRoutes
    .filter(
      (route) =>
        (route.navLabel ?? route.isAgentDisplayName) && route.sidebarView === 'agentSettings'
    )
    .map((route) => ({
      label: route.navLabel!,
      path: route.path.replace(':agentId', agentId),
      icon: route.navIcon,
      section: route.navSection,
      isConnectors: route.isConnectors,
      isAgentDisplayName: route.isAgentDisplayName,
    }));
};

export const getManageNavItems = (): SidebarNavItem[] => {
  return manageRoutes
    .filter((route) => route.navLabel)
    .map((route) => ({
      label: route.navLabel!,
      path: route.path,
      icon: route.navIcon,
      section: route.navSection,
      isExperimental: route.isExperimental,
      isConnectors: route.isConnectors,
    }));
};
