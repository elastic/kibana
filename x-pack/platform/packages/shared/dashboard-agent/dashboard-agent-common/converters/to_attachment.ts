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
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
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
  if (panel.type === LENS_EMBEDDABLE_TYPE) {
    const panelConfig = panel.config as
      | { attributes?: LensApiSchemaType | LensAttributes }
      | undefined;
    const attributes = panelConfig?.attributes;

    if (isLensAttributes(attributes)) {
      try {
        const apiFormatAttributes = new LensConfigBuilder().toAPIFormat(
          attributes
        ) as unknown as Record<string, unknown>;

        return {
          type: LENS_EMBEDDABLE_TYPE,
          id: panel.id ?? '',
          config: {
            ...panelConfig,
            attributes: apiFormatAttributes,
          },
          grid: panel.grid,
        };
      } catch {
        // fall through to generic storage when the Lens attributes cannot be converted to API format
      }
    }
  }

  return {
    type: panel.type,
    id: panel.id ?? '',
    config: (panel.config as Record<string, unknown> | undefined) ?? {},
    grid: panel.grid,
  };
};

/**
 * Converts a DashboardSection to a DashboardAttachmentSection.
 */
export const toAttachmentSection = (section: DashboardSection): DashboardAttachmentSection => ({
  id: section.id ?? '',
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
 * Preserves all dashboard state fields for full round-trip support.
 */
export const dashboardStateToAttachmentData = (state: DashboardState): DashboardAttachmentData => {
  return {
    ...state,
    panels: state.panels
      .map(toAttachmentWidget)
      .filter(
        (widget): widget is DashboardAttachmentData['panels'][number] => widget !== undefined
      ),

    filters: state.filters as DashboardAttachmentData['filters'],
    pinned_panels: state.pinned_panels as DashboardAttachmentData['pinned_panels'],
    access_control: state.access_control as DashboardAttachmentData['access_control'],
  };
};
