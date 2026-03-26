/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DashboardPanel,
  DashboardSection,
  DashboardState,
} from '@kbn/dashboard-plugin/server';
import {
  LensConfigBuilder,
  type LensApiSchemaType,
  type LensAttributes,
} from '@kbn/lens-embeddable-utils/config_builder';
import type { AttachmentPanel, DashboardSection as DashboardAttachmentSection } from '../types';
import type { DashboardAttachmentData } from '../types';

/**
 * Type guard to check if attributes are in LensAttributes format (internal).
 * LensAttributes have a `visualizationType` property, while LensApiSchemaType does not.
 */
export const isLensAttributes = (
  attributes: LensApiSchemaType | LensAttributes | undefined
): attributes is LensAttributes => {
  return Boolean(attributes && typeof attributes === 'object' && 'visualizationType' in attributes);
};

/**
 * Converts a DashboardPanel to an AttachmentPanel.
 * For Lens panels with internal attributes format, converts to API format.
 */
export const toAttachmentPanel = (panel: DashboardPanel): AttachmentPanel | undefined => {
  // TODO: update this when LENS_EMBEDDABLE_TYPE is moved to @kbn/lens-common
  if (panel.type === 'lens') {
    const attributes = (
      panel.config as { attributes?: LensApiSchemaType | LensAttributes } | undefined
    )?.attributes;

    if (isLensAttributes(attributes)) {
      try {
        const visualization = new LensConfigBuilder().toAPIFormat(attributes) as unknown as Record<
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

/**
 * Converts a DashboardSection to a DashboardAttachmentSection.
 */
export const toAttachmentSection = (section: DashboardSection): DashboardAttachmentSection => ({
  uid: section.uid ?? '',
  title: section.title,
  collapsed: section.collapsed ?? false,
  grid: { y: section.grid.y },
  panels: section.panels
    .map(toAttachmentPanel)
    .filter((panel): panel is AttachmentPanel => panel !== undefined),
});

/**
 * Converts a DashboardPanel or DashboardSection to the corresponding attachment type.
 */
export const toAttachmentWidget = (
  widget: DashboardPanel | DashboardSection
): DashboardAttachmentData['panels'][number] | undefined => {
  if ('panels' in widget) {
    return toAttachmentSection(widget);
  }

  return toAttachmentPanel(widget);
};

/**
 * Converts a DashboardState to DashboardAttachmentData.
 */
export const dashboardStateToAttachment = (state: DashboardState): DashboardAttachmentData => {
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
