/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type SidebarView = 'conversation' | 'agentSettings' | 'manage';

const AGENT_SETTINGS_SEGMENTS = ['skills', 'tools', 'plugins', 'connectors', 'instructions'];

export const getSidebarViewForRoute = (pathname: string): SidebarView => {
  if (pathname.startsWith('/manage')) {
    return 'manage';
  }

  if (pathname.startsWith('/agents/')) {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length >= 3 && AGENT_SETTINGS_SEGMENTS.includes(segments[2])) {
      return 'agentSettings';
    }
  }

  return 'conversation';
};

export const getAgentIdFromPath = (pathname: string): string | undefined => {
  const match = pathname.match(/^\/agents\/([^/]+)/);
  return match ? match[1] : undefined;
};
