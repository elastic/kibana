/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsClient, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import overviewDashboard from './assets/overview-dashboard.json';
import {
  AGENT_BUILDER_DASHBOARD_CORE_MIGRATION_VERSION,
  AGENT_BUILDER_DASHBOARD_TYPE_MIGRATION_VERSION,
  AGENT_BUILDER_OVERVIEW_DASHBOARD_DEFINITION_VERSION,
  AGENT_BUILDER_OVERVIEW_DASHBOARD_ID,
  AGENT_BUILDER_TRACES_NAMESPACE_PLACEHOLDER,
} from './constants';

interface DashboardGridPosition {
  x?: number;
  y: number;
  w?: number;
  h?: number;
}

interface DashboardPanelAsset {
  id: string;
  type: string;
  grid: DashboardGridPosition;
  config?: Record<string, unknown>;
}

interface DashboardSectionAsset {
  id: string;
  title?: string;
  collapsed?: boolean;
  grid: DashboardGridPosition;
  panels: DashboardPanelAsset[];
}

type DashboardWidget = DashboardPanelAsset | DashboardSectionAsset;

interface SavedDashboardPanel {
  type: string;
  panelIndex: string;
  gridData: DashboardGridPosition & { i: string; sectionId?: string };
  embeddableConfig: Record<string, unknown>;
}

interface SavedDashboardSection {
  title: string;
  collapsed?: boolean;
  gridData: { y: number; i: string };
}

const isDashboardSection = (widget: DashboardWidget): widget is DashboardSectionAsset =>
  'panels' in widget;

// transform the options to the saved dashboard options
const transformOptionsIn = (options: typeof overviewDashboard.options): string => {
  const apiToSavedObjectOptionsKeys = {
    hide_panel_titles: 'hidePanelTitles',
    hide_panel_borders: 'hidePanelBorders',
    use_margins: 'useMargins',
    sync_colors: 'syncColors',
    sync_tooltips: 'syncTooltips',
    sync_cursor: 'syncCursor',
    auto_apply_filters: 'autoApplyFilters',
  } as const;

  const savedObjectOptions: Record<string, unknown> = {};
  for (const [apiKey, soKey] of Object.entries(apiToSavedObjectOptionsKeys)) {
    if (apiKey in options) {
      savedObjectOptions[soKey] = options[apiKey as keyof typeof options];
    }
  }
  return JSON.stringify(savedObjectOptions);
};

// transform the lens visualization panel config to the saved dashboard panel config
function transformVisPanelConfig(
  builder: LensConfigBuilder,
  config: Record<string, unknown>
): Record<string, unknown> {
  const {
    title,
    description,
    hide_title,
    hide_border,
    time_range,
    drilldowns,
    ...attributesConfig
  } = config;

  const lensAttributes = builder.fromAPIFormat(
    attributesConfig as Parameters<LensConfigBuilder['fromAPIFormat']>[0]
  );

  return {
    ...(typeof title === 'string' && { title }),
    ...(typeof description === 'string' && { description }),
    ...(typeof hide_title === 'boolean' && { hide_title }),
    ...(typeof hide_border === 'boolean' && { hide_border }),
    ...(time_range !== undefined && { time_range }),
    ...(drilldowns !== undefined && { drilldowns }),
    attributes: lensAttributes,
  };
}

// return true if the panel is a lens visualization panel
const isLensVisualizationPanel = (panel: DashboardPanelAsset) =>
  panel.type === LENS_EMBEDDABLE_TYPE || panel.type === 'vis';

// transform the panel to the saved dashboard panel
function transformPanel(
  panel: DashboardPanelAsset,
  builder: LensConfigBuilder,
  sectionId?: string
): SavedDashboardPanel {
  const isLensPanel = isLensVisualizationPanel(panel);
  const embeddableConfig =
    isLensPanel && panel.config
      ? transformVisPanelConfig(builder, panel.config)
      : panel.config ?? {};

  return {
    type: isLensPanel ? LENS_EMBEDDABLE_TYPE : panel.type,
    panelIndex: panel.id,
    gridData: {
      x: panel.grid.x ?? 0,
      y: panel.grid.y,
      w: panel.grid.w ?? 48,
      h: panel.grid.h ?? 6,
      i: panel.id,
      ...(sectionId && { sectionId }),
    },
    embeddableConfig,
  };
}

// build the panels for the dashboard
function buildOverviewDashboardPanels(): {
  panels: SavedDashboardPanel[];
  sections: SavedDashboardSection[];
} {
  const builder = new LensConfigBuilder();
  const panels: SavedDashboardPanel[] = [];
  const sections: SavedDashboardSection[] = [];

  for (const widget of overviewDashboard.panels as DashboardWidget[]) {
    if (isDashboardSection(widget)) {
      sections.push({
        title: widget.title ?? '',
        collapsed: widget.collapsed ?? false,
        gridData: { y: widget.grid.y, i: widget.id },
      });

      for (const panel of widget.panels) {
        panels.push(transformPanel(panel, builder, widget.id));
      }
    } else {
      panels.push(transformPanel(widget, builder));
    }
  }

  return { panels, sections };
}

// return the id of the dashboard in the given space
function overviewDashboardId(spaceId: string): string {
  return `${AGENT_BUILDER_OVERVIEW_DASHBOARD_ID}-${spaceId}`;
}

// install the dashboard in the given space
async function installAgentBuilderOverviewDashboard(
  client: SavedObjectsClientContract,
  logger: Logger,
  spaceId: string,
  namespace: string | undefined
): Promise<void> {
  const dashboardId = overviewDashboardId(spaceId);
  logger.debug(
    `Installing Agent Builder overview dashboard (${dashboardId}, definition v${AGENT_BUILDER_OVERVIEW_DASHBOARD_DEFINITION_VERSION}) in space "${spaceId}"...`
  );

  const { panels, sections } = buildOverviewDashboardPanels();

  await client.create(
    'dashboard',
    {
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          query: {
            query: overviewDashboard.query?.expression ?? '',
            language: 'kuery',
          },
        }),
      },
      optionsJSON: transformOptionsIn(overviewDashboard.options),
      panelsJSON: JSON.stringify(panels).replaceAll(
        AGENT_BUILDER_TRACES_NAMESPACE_PLACEHOLDER,
        spaceId
      ),
      ...(sections.length > 0 && { sections }),
      timeRestore: false,
      title: overviewDashboard.title,
      version: AGENT_BUILDER_OVERVIEW_DASHBOARD_DEFINITION_VERSION,
    },
    {
      id: dashboardId,
      references: [],
      overwrite: true,
      managed: true,
      namespace,
      coreMigrationVersion: AGENT_BUILDER_DASHBOARD_CORE_MIGRATION_VERSION,
      typeMigrationVersion: AGENT_BUILDER_DASHBOARD_TYPE_MIGRATION_VERSION,
      refresh: false,
    }
  );

  logger.debug(`Agent Builder overview dashboard installed in space "${spaceId}"`);
}

// remove the dashboard from the given space
async function removeAgentBuilderOverviewDashboard(
  client: SavedObjectsClientContract,
  logger: Logger,
  spaceId: string,
  namespace: string | undefined
): Promise<void> {
  try {
    await client.delete('dashboard', overviewDashboardId(spaceId), { namespace });
    logger.debug(`Agent Builder overview dashboard removed from space "${spaceId}"`);
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      logger.debug(`Agent Builder overview dashboard already absent in space "${spaceId}"`);
      return;
    }
    throw error;
  }
}

// return true if the experimental features are enabled for the given space
async function isExperimentalFeaturesEnabledForSpace(
  client: SavedObjectsClientContract,
  kibanaVersion: string,
  namespace: string | undefined
): Promise<boolean> {
  const configId = kibanaVersion.replace(/-.*$/, '');
  try {
    const configSO = await client.get<Record<string, unknown>>('config', configId, { namespace });
    return configSO.attributes[AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID] === true;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return false;
    }
    throw error;
  }
}

// return the version of the dashboard in the given space
async function getInstalledDashboardVersion(
  client: SavedObjectsClientContract,
  spaceId: string,
  namespace: string | undefined
): Promise<number | null> {
  try {
    const existing = await client.get<{ version?: number }>(
      'dashboard',
      overviewDashboardId(spaceId),
      { namespace }
    );
    return typeof existing.attributes.version === 'number' ? existing.attributes.version : null;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

// sync the dashboard for all spaces
export async function syncAgentBuilderOverviewDashboard(
  coreStart: Pick<CoreStart, 'savedObjects'>,
  kibanaVersion: string,
  logger: Logger
): Promise<void> {
  const client = new SavedObjectsClient(coreStart.savedObjects.createInternalRepository());

  // `space` is a hidden SO type and must be explicitly allowlisted.
  const spaceRepo = coreStart.savedObjects.createInternalRepository(['space']);
  const { saved_objects: spaceObjects } = await spaceRepo.find({
    type: 'space',
    perPage: 1000,
    page: 1,
  });
  const spaceIds = ['default', ...spaceObjects.map((s) => s.id).filter((id) => id !== 'default')];

  for (const spaceId of spaceIds) {
    const namespace = spaceId === 'default' ? undefined : spaceId;

    const enabled = await isExperimentalFeaturesEnabledForSpace(client, kibanaVersion, namespace);
    if (enabled) {
      const installedVersion = await getInstalledDashboardVersion(client, spaceId, namespace);
      if (installedVersion === AGENT_BUILDER_OVERVIEW_DASHBOARD_DEFINITION_VERSION) {
        logger.debug(
          `Agent Builder overview dashboard is up to date in space "${spaceId}", skipping`
        );
        continue;
      }
      await installAgentBuilderOverviewDashboard(client, logger, spaceId, namespace);
    } else {
      await removeAgentBuilderOverviewDashboard(client, logger, spaceId, namespace);
    }
  }
}
