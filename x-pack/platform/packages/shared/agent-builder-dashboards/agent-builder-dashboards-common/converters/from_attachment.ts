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
} from '@kbn/as-code-dashboard-schema';
import { isLensAPIFormat, LensConfigBuilder, type LensApiConfig } from '@kbn/lens-embeddable-utils';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { VISUALIZE_EMBEDDABLE_TYPE } from '@kbn/visualizations-common';
import { buildVegaSavedVis, VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';
import type {
  AttachmentPanel,
  DashboardSection as AgentDashboardSection,
  DashboardAttachmentData,
} from '../types';
import { isSection } from '../types';
import { EMPTY_DASHBOARD_STATE } from '../dashboard_state_helpers';

type PanelConfig = AttachmentPanel['config'];
type LensConfigConverter = (config: PanelConfig) => PanelConfig;

const withLensAttributes: LensConfigConverter = (config) =>
  isLensAPIFormat(config)
    ? { ...config, attributes: new LensConfigBuilder().fromAPIFormat(config) }
    : config;

const passLensConfigThrough: LensConfigConverter = (config) => config;

// Splits the panel settings from the chart the way the Lens embeddable transform does.
const toStoredLensState: LensConfigConverter = (config) => {
  if (!isLensAPIFormat(config)) {
    return config;
  }
  const {
    title,
    description,
    hide_title,
    hide_border,
    time_range,
    drilldowns,
    ...chartConfig
  }: PanelConfig = config;
  return {
    title,
    description,
    hide_title,
    hide_border,
    time_range,
    drilldowns,
    attributes: new LensConfigBuilder().fromAPIFormat(chartConfig as LensApiConfig),
  };
};

/**
 * Converts an AttachmentPanel to a DashboardPanel.
 * - Lens panel configs go through `convertLensConfig`.
 * - `vega` panels (the future native API shape, `config.spec`) are expanded to a
 *   by-value legacy-vis (`visualization`) embeddable for rendering and saving. This is a
 *   temporary bridge: once the native `vega` embeddable API ships, the panel can
 *   be passed through unchanged and this branch removed.
 */
const buildPanelFromConfig = (
  { config, type, id, grid }: AttachmentPanel,
  convertLensConfig: LensConfigConverter
): DashboardPanel => {
  if (type === VEGA_VIS_TYPE) {
    const { spec, title, description, ...restConfig } = config as {
      spec?: unknown;
      title?: unknown;
      description?: unknown;
    } & Record<string, unknown>;
    const panelTitle = typeof title === 'string' ? title : '';
    const panelDescription = typeof description === 'string' ? description : '';
    return {
      type: VISUALIZE_EMBEDDABLE_TYPE,
      id,
      grid,
      config: {
        // Preserve panel-level settings (hide_title, hide_border, drilldowns, …).
        ...restConfig,
        ...(typeof title === 'string' ? { title: panelTitle } : {}),
        ...(typeof description === 'string' ? { description: panelDescription } : {}),
        savedVis: buildVegaSavedVis({
          spec: typeof spec === 'string' ? spec : '',
          title: panelTitle,
          description: panelDescription,
        }),
      },
    };
  }

  return {
    type,
    id,
    grid,
    config: type === LENS_EMBEDDABLE_TYPE ? convertLensConfig(config) : config,
  };
};

type AgentWidget = AttachmentPanel | AgentDashboardSection;
type DashboardWidget = DashboardPanel | DashboardSection;

/**
 * Converts an AgentDashboardSection to a DashboardSection.
 */
const normalizeSection = (
  section: AgentDashboardSection,
  convertLensConfig: LensConfigConverter
): DashboardSection => ({
  id: section.id,
  title: section.title,
  collapsed: section.collapsed,
  grid: { y: section.grid.y },
  panels: section.panels.map((panel) => buildPanelFromConfig(panel, convertLensConfig)),
});

/**
 * Converts an array of attachment widgets to dashboard widgets.
 */
const normalizeWidgets = (
  widgets: AgentWidget[],
  convertLensConfig: LensConfigConverter
): DashboardWidget[] =>
  (widgets ?? []).map((widget) =>
    isSection(widget)
      ? normalizeSection(widget, convertLensConfig)
      : buildPanelFromConfig(widget, convertLensConfig)
  );

const toDashboardState =
  (convertLensConfig: LensConfigConverter) =>
  ({
    panels = [],
    filters,
    query,
    pinned_panels,
    access_control,
    options,
    ...rest
  }: DashboardAttachmentData): DashboardState => ({
    ...EMPTY_DASHBOARD_STATE,
    ...rest,
    options: {
      ...EMPTY_DASHBOARD_STATE.options,
      ...options,
    },
    panels: normalizeWidgets(panels, convertLensConfig),
    ...(filters && { filters: filters as DashboardState['filters'] }),
    ...(query && { query: query as DashboardState['query'] }),
    ...(pinned_panels && { pinned_panels: pinned_panels as DashboardState['pinned_panels'] }),
    ...(access_control && { access_control: access_control as DashboardState['access_control'] }),
  });

/**
 * Converts a DashboardAttachment to the DashboardState the browser renders.
 * Uses provided values from the attachment, falling back to defaults for missing fields.
 */
export const attachmentDataToDashboardState = toDashboardState(withLensAttributes);

/**
 * Converts a DashboardAttachment to the DashboardState the Dashboard app saves. The app takes Lens
 * panels in the Lens API format only while Lens as code is enabled (`lensApiFormat`); otherwise
 * they are converted to stored Lens state.
 */
export const attachmentDataToSavedDashboardState = (
  data: DashboardAttachmentData,
  { lensApiFormat }: { lensApiFormat: boolean }
): DashboardState =>
  toDashboardState(lensApiFormat ? passLensConfigThrough : toStoredLensState)(data);
