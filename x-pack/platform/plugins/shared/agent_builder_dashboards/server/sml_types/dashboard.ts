/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlTypeDefinition } from '@kbn/agent-context-layer-plugin/server';
import {
  formatOriginId,
  KIBANA_RESOLVER_TYPE,
  parseOriginId,
} from '@kbn/agent-context-layer-plugin/server';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  dashboardStateToAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import type {
  DashboardPanel,
  DashboardPluginStart,
  DashboardSection,
  DashboardState,
} from '@kbn/dashboard-plugin/server';

const DASHBOARD_SML_TYPE = 'dashboard';
const DASHBOARD_SAVED_OBJECT_TYPE = 'dashboard';

/**
 * Build the origin id used for a dashboard SML entry. The path component
 * (`<saved_object_type>/<saved_object_id>`) is consumed by the built-in
 * `kibana` resolver to derive the required `saved_object:dashboard/get`
 * privilege at index time.
 */
const buildDashboardOriginId = (savedObjectId: string): string =>
  formatOriginId(KIBANA_RESOLVER_TYPE, `${DASHBOARD_SAVED_OBJECT_TYPE}/${savedObjectId}`);

/**
 * Extract the dashboard saved-object id from a prefixed dashboard origin id.
 * Tolerates legacy bare ids (no `kibana://` scheme) for any unmigrated
 * crawler-state entries left over from before the resolver-based scheme
 * was introduced.
 */
const extractDashboardId = (originId: string): string => {
  const { scheme, path } = parseOriginId(originId);
  if (!scheme) {
    return originId;
  }
  const sep = path.indexOf('/');
  return sep > 0 ? path.slice(sep + 1) : path;
};

interface CreateDashboardSmlTypeOptions {
  getDashboardClient: () => Promise<DashboardPluginStart['client']>;
}

const toPanelSummary = (panel: DashboardPanel): string[] => {
  const title =
    (panel.config as { title?: string } | undefined)?.title ??
    (panel.config as { attributes?: { title?: string } } | undefined)?.attributes?.title;

  return [title, panel.type, panel.id ? `panel:${panel.id}` : undefined].filter(
    (value): value is string => Boolean(value)
  );
};

const toDashboardSearchContent = (state: DashboardState): string => {
  const topLevelPanels = state.panels.filter(
    (panel): panel is DashboardPanel => !('panels' in panel)
  );
  const sections = state.panels.filter((panel): panel is DashboardSection => 'panels' in panel);

  const contentParts = [state.title, state.description];

  for (const panel of topLevelPanels) {
    contentParts.push(...toPanelSummary(panel));
  }

  for (const section of sections) {
    contentParts.push(section.title, `section:${section.id}`);
    for (const panel of section.panels) {
      contentParts.push(...toPanelSummary(panel));
    }
  }

  contentParts.push(
    `${
      topLevelPanels.length + sections.reduce((count, section) => count + section.panels.length, 0)
    } panels`,
    `${sections.length} sections`
  );

  return contentParts.filter(Boolean).join('\n');
};

export const createDashboardSmlType = ({
  getDashboardClient,
}: CreateDashboardSmlTypeOptions): SmlTypeDefinition => ({
  id: DASHBOARD_SML_TYPE,
  fetchFrequency: () => '30m',

  async *list(context) {
    const finder = context.savedObjectsClient.createPointInTimeFinder({
      type: DASHBOARD_SAVED_OBJECT_TYPE,
      perPage: 1000,
      namespaces: ['*'],
      fields: ['title'],
    });

    try {
      for await (const response of finder.find()) {
        yield response.saved_objects.map((savedObject) => ({
          id: buildDashboardOriginId(savedObject.id),
          updatedAt: savedObject.updated_at ?? new Date().toISOString(),
          spaces: savedObject.namespaces ?? [],
        }));
      }
    } finally {
      await finder.close();
    }
  },

  getSmlData: async (originId, context) => {
    const dashboardId = extractDashboardId(originId);
    try {
      const dashboardClient = await getDashboardClient();
      const dashboard = await dashboardClient.read(context.savedObjectsClient, dashboardId);

      // No `permissions` field — the `kibana` resolver computes
      // `saved_object:dashboard/get` from the prefixed origin id at
      // index time.
      return {
        chunks: [
          {
            type: DASHBOARD_SML_TYPE,
            title: dashboard.data.title ?? dashboardId,
            content: toDashboardSearchContent(dashboard.data),
          },
        ],
      };
    } catch (error) {
      context.logger.warn(
        `SML dashboard: failed to get data for '${originId}': ${(error as Error).message}`
      );
      return undefined;
    }
  },

  toAttachment: async (item, context) => {
    const dashboardId = extractDashboardId(item.origin_id);
    try {
      const dashboardClient = await getDashboardClient();
      const dashboard = await dashboardClient.read(context.savedObjectsClient, dashboardId);

      return {
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: dashboardStateToAttachmentData(dashboard.data),
        origin: dashboard.id,
      };
    } catch (error) {
      throw new Error(
        `SML dashboard: failed to get data for '${item.origin_id}': ${(error as Error).message}`
      );
    }
  },
});
