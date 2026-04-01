/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { SmlTypeDefinition } from '@kbn/agent-builder-plugin/server';
import { DASHBOARD_ATTACHMENT_TYPE, dashboardStateToAttachment } from '@kbn/dashboard-agent-common';
import type {
  DashboardPanel,
  DashboardPluginStart,
  DashboardSection,
  DashboardState,
} from '@kbn/dashboard-plugin/server';

const DASHBOARD_SML_TYPE = 'dashboard';

interface CreateDashboardSmlTypeOptions {
  getDashboardClient: () => Promise<DashboardPluginStart['client']>;
}

const getReferenceText = (
  references: SavedObjectReference[] | undefined,
  uid: string
): string[] => {
  if (!references || references.length === 0) {
    return [];
  }

  return references
    .filter((reference) => reference.name.includes(uid) || reference.name === 'savedObjectRef')
    .map((reference) => `${reference.type}:${reference.id}`);
};

const toPanelSummary = (
  panel: DashboardPanel,
  references: SavedObjectReference[] | undefined
): string[] => {
  const title =
    (panel.config as { title?: string } | undefined)?.title ??
    (panel.config as { attributes?: { title?: string } } | undefined)?.attributes?.title;

  return [
    title,
    panel.type,
    panel.uid ? `panel:${panel.uid}` : undefined,
    ...(panel.uid ? getReferenceText(references, panel.uid) : []),
  ].filter((value): value is string => Boolean(value));
};

const toDashboardSearchContent = (
  state: DashboardState,
  references: SavedObjectReference[] | undefined
): string => {
  const topLevelPanels = state.panels.filter(
    (panel): panel is DashboardPanel => !('panels' in panel)
  );
  const sections = state.panels.filter((panel): panel is DashboardSection => 'panels' in panel);

  const contentParts = [state.title, state.description];

  for (const panel of topLevelPanels) {
    contentParts.push(...toPanelSummary(panel, references));
  }

  for (const section of sections) {
    contentParts.push(section.title, `section:${section.uid}`);
    for (const panel of section.panels) {
      contentParts.push(...toPanelSummary(panel, references));
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
      type: 'dashboard',
      perPage: 1000,
      namespaces: ['*'],
      fields: ['title'],
    });

    try {
      for await (const response of finder.find()) {
        yield response.saved_objects.map((savedObject) => ({
          id: savedObject.id,
          updatedAt: savedObject.updated_at ?? new Date().toISOString(),
          spaces: savedObject.namespaces ?? [],
        }));
      }
    } finally {
      await finder.close();
    }
  },

  getSmlData: async (originId, context) => {
    try {
      if (!context.requestHandlerContext) {
        return undefined;
      }

      const dashboardClient = await getDashboardClient();
      const dashboard = await dashboardClient.read(context.requestHandlerContext, originId);

      return {
        chunks: [
          {
            type: DASHBOARD_SML_TYPE,
            title: dashboard.data.title ?? originId,
            content: toDashboardSearchContent(dashboard.data, undefined),
            permissions: ['saved_object:dashboard/get'],
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
    if (!context.requestHandlerContext) {
      return undefined;
    }

    const dashboardClient = await getDashboardClient();
    const dashboard = await dashboardClient.read(context.requestHandlerContext, item.origin_id);

    return {
      type: DASHBOARD_ATTACHMENT_TYPE,
      data: dashboardStateToAttachment(dashboard.data),
      origin: dashboard.id,
    };
  },
});
