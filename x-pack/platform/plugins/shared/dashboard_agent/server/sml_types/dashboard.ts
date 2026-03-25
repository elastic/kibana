/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { SmlTypeDefinition } from '@kbn/agent-builder-plugin/server';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  type AttachmentPanel,
  type DashboardAttachmentData,
  type DashboardSection as DashboardAttachmentSection,
} from '@kbn/dashboard-agent-common';
import type {
  DashboardPanel,
  DashboardSection,
  DashboardState,
} from '@kbn/dashboard-plugin/server';
import type { DashboardSavedObjectAttributes } from '@kbn/dashboard-plugin/server';
import { transformDashboardOut } from '@kbn/dashboard-plugin/server/api/transforms/out/transform_dashboard_out';
import {
  LensConfigBuilder,
  type LensApiSchemaType,
  type LensAttributes,
} from '@kbn/lens-embeddable-utils/config_builder';

const DASHBOARD_SML_TYPE = 'dashboard';
const lensConfigBuilder = new LensConfigBuilder();

const isLensAttributes = (
  attributes: LensApiSchemaType | LensAttributes | undefined
): attributes is LensAttributes => {
  return Boolean(attributes && typeof attributes === 'object' && 'visualizationType' in attributes);
};

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

const toAttachmentPanel = (panel: DashboardPanel): AttachmentPanel | undefined => {
  // TODO: update this when LENS_EMBEDDABLE_TYPE is moved to @kbn/lens-common
  if (panel.type === 'lens') {
    const attributes = (
      panel.config as { attributes?: LensApiSchemaType | LensAttributes } | undefined
    )?.attributes;

    if (isLensAttributes(attributes)) {
      try {
        const visualization = lensConfigBuilder.toAPIFormat(attributes) as unknown as Record<
          string,
          unknown
        >;

        return {
          type: 'lens',
          uid: panel.uid ?? '',
          config: visualization,
          grid: panel.grid,
        };
      } catch {
        // fall through to generic storage when the Lens attributes cannot be converted to API format
      }
    }
  }

  return {
    type: panel.type,
    uid: panel.uid ?? '',
    config: (panel.config as Record<string, unknown> | undefined) ?? {},
    grid: panel.grid,
  };
};

const toAttachmentSection = (section: DashboardSection): DashboardAttachmentSection => ({
  uid: section.uid ?? '',
  title: section.title,
  collapsed: section.collapsed ?? false,
  grid: { y: section.grid.y },
  panels: section.panels
    .map(toAttachmentPanel)
    .filter((panel): panel is AttachmentPanel => panel !== undefined),
});

const toAttachmentWidget = (
  widget: DashboardPanel | DashboardSection
): DashboardAttachmentData['panels'][number] | undefined => {
  if ('panels' in widget) {
    return toAttachmentSection(widget);
  }

  return toAttachmentPanel(widget);
};

const toAttachmentData = (state: DashboardState): DashboardAttachmentData => {
  return {
    title: state.title ?? '',
    description: state.description ?? '',
    panels: state.panels
      .map(toAttachmentWidget)
      .filter(
        (widget): widget is DashboardAttachmentData['panels'][number] => widget !== undefined
      ),
  };
};

const toDashboardState = (
  attributes: DashboardSavedObjectAttributes,
  references: SavedObjectReference[] | undefined
): DashboardState => {
  return transformDashboardOut(attributes, references) as DashboardState;
};

export const dashboardSmlType: SmlTypeDefinition = {
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
      const savedObject = await context.savedObjectsClient.get<DashboardSavedObjectAttributes>(
        'dashboard',
        originId
      );
      const state = toDashboardState(savedObject.attributes, savedObject.references);

      return {
        chunks: [
          {
            type: DASHBOARD_SML_TYPE,
            title: state.title ?? originId,
            content: toDashboardSearchContent(state, savedObject.references),
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
    const resolveResult = await context.savedObjectsClient.resolve<DashboardSavedObjectAttributes>(
      'dashboard',
      item.origin_id
    );

    const resolvedDashboard = resolveResult.saved_object as typeof resolveResult.saved_object & {
      error?: { message?: string };
    };

    if (resolvedDashboard.error) {
      return undefined;
    }

    const state = toDashboardState(resolvedDashboard.attributes, resolvedDashboard.references);

    return {
      type: DASHBOARD_ATTACHMENT_TYPE,
      data: toAttachmentData(state),
      origin: resolvedDashboard.id,
    };
  },
};
