/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderViewIds } from './agent_builder_view_ids';
import {
  allRoutes,
  getAgentIdFromPath,
  getEnabledRoutes,
  getSidebarViewForRoute,
  getViewIdForPathname,
} from './route_config';

const enabledRoutesWithExperimental = getEnabledRoutes({ experimental: true });

describe('route_config', () => {
  describe('getSidebarViewForRoute', () => {
    describe('agent routes', () => {
      it('returns "conversation" for agent root', () => {
        expect(getSidebarViewForRoute('/agents/elastic-ai-agent')).toBe('conversation');
        expect(getSidebarViewForRoute('/agents/my-custom-agent')).toBe('conversation');
      });

      it('returns "conversation" for conversation routes', () => {
        expect(getSidebarViewForRoute('/agents/elastic-ai-agent/conversations/123')).toBe(
          'conversation'
        );
        expect(getSidebarViewForRoute('/agents/my-agent/conversations/abc-def')).toBe(
          'conversation'
        );
      });

      it('returns "conversation" for overview route', () => {
        expect(getSidebarViewForRoute('/agents/elastic-ai-agent/overview')).toBe('conversation');
      });

      it('returns "conversation" for skills route', () => {
        expect(getSidebarViewForRoute('/agents/elastic-ai-agent/skills')).toBe('conversation');
      });

      it('returns "conversation" for tools route', () => {
        expect(getSidebarViewForRoute('/agents/elastic-ai-agent/tools')).toBe('conversation');
      });

      it('returns "conversation" for plugins route', () => {
        expect(getSidebarViewForRoute('/agents/elastic-ai-agent/plugins')).toBe('conversation');
      });
    });

    describe('manage routes', () => {
      it('returns "manage" for manage agents routes', () => {
        expect(getSidebarViewForRoute('/manage/agents')).toBe('manage');
        expect(getSidebarViewForRoute('/manage/agents/new')).toBe('manage');
      });

      it('returns "manage" for manage tools routes', () => {
        expect(getSidebarViewForRoute('/manage/tools')).toBe('manage');
        expect(getSidebarViewForRoute('/manage/tools/new')).toBe('manage');
        expect(getSidebarViewForRoute('/manage/tools/tool-123')).toBe('manage');
        expect(getSidebarViewForRoute('/manage/tools/bulk_import_mcp')).toBe('manage');
      });

      it('returns "manage" for manage skills routes', () => {
        expect(getSidebarViewForRoute('/manage/skills')).toBe('manage');
        expect(getSidebarViewForRoute('/manage/skills/new')).toBe('manage');
        expect(getSidebarViewForRoute('/manage/skills/skill-123')).toBe('manage');
      });

      it('returns "manage" for manage plugins routes', () => {
        expect(getSidebarViewForRoute('/manage/plugins')).toBe('manage');
        expect(getSidebarViewForRoute('/manage/plugins/plugin-123')).toBe('manage');
      });

      it('returns "manage" for manage connectors route', () => {
        expect(getSidebarViewForRoute('/manage/connectors')).toBe('manage');
      });
    });

    describe('fallback behavior', () => {
      it('returns "conversation" for unknown routes', () => {
        expect(getSidebarViewForRoute('/unknown')).toBe('conversation');
        expect(getSidebarViewForRoute('/')).toBe('conversation');
        expect(getSidebarViewForRoute('/some/random/path')).toBe('conversation');
      });
    });
  });

  describe('getAgentIdFromPath', () => {
    it('extracts agent ID from agent routes', () => {
      expect(getAgentIdFromPath('/agents/elastic-ai-agent')).toBe('elastic-ai-agent');
      expect(getAgentIdFromPath('/agents/my-custom-agent')).toBe('my-custom-agent');
      expect(getAgentIdFromPath('/agents/elastic-ai-agent/skills')).toBe('elastic-ai-agent');
      expect(getAgentIdFromPath('/agents/elastic-ai-agent/conversations/123')).toBe(
        'elastic-ai-agent'
      );
    });

    it('returns undefined for non-agent routes', () => {
      expect(getAgentIdFromPath('/manage/agents')).toBeUndefined();
      expect(getAgentIdFromPath('/manage/tools')).toBeUndefined();
      expect(getAgentIdFromPath('/')).toBeUndefined();
      expect(getAgentIdFromPath('/unknown')).toBeUndefined();
    });
  });

  describe('getViewIdForPathname', () => {
    it('returns the TrackApplicationView viewId for agent tools', () => {
      expect(
        getViewIdForPathname('/agents/elastic-ai-agent/tools', enabledRoutesWithExperimental)
      ).toBe(agentBuilderViewIds.agentTools);
    });

    it('returns the viewId for conversation route', () => {
      expect(
        getViewIdForPathname(
          '/agents/elastic-ai-agent/conversations/conv-1',
          enabledRoutesWithExperimental
        )
      ).toBe(agentBuilderViewIds.agentConversation);
    });

    it('returns the viewId for manage tools list', () => {
      expect(getViewIdForPathname('/manage/tools', enabledRoutesWithExperimental)).toBe(
        agentBuilderViewIds.manageTools
      );
    });

    it('returns undefined when no enabled route matches', () => {
      expect(getViewIdForPathname('/unknown', enabledRoutesWithExperimental)).toBeUndefined();
    });
  });

  describe('route view ids', () => {
    it('uses a stable prefixed viewId for every route', () => {
      allRoutes.forEach((route) => {
        expect(route.viewId).toBeTruthy();
        expect(route.viewId.startsWith('agent_builder_')).toBe(true);
      });
    });

    it('uses unique viewId values across all routes', () => {
      const viewIds = allRoutes.map((route) => route.viewId);
      const uniqueViewIds = new Set(viewIds);

      expect(uniqueViewIds.size).toBe(viewIds.length);
    });
  });
});
