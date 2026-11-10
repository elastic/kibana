/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaRequest } from '@kbn/core/server';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import type { DataView, DataViewsService } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type {
  MaterializeDescription,
  MaterializeScope,
  Materializer,
} from '../../materialize/types';
import { createUnsupportedNode } from '../../materialize/unsupported';
import type { DashboardConfig } from './config';
import { parseDashboardConfig } from './config';
import { dashboardControls, resolveControlFilters } from './controls';
import { toGrid } from './grid';
import type { ListedPanel } from './list_panels';
import { allPanels, listDashboard } from './list_panels';
import { loadDashboard } from './load';
import { dashboardContext, panelContext } from './panel_context';

export const DASHBOARD_SAVED_OBJECT_TYPE = 'dashboard';

export interface DashboardMaterializerDeps {
  /** The Dashboard plugin's start contract, when the plugin is enabled. */
  getDashboard: () => Promise<DashboardPluginStart | undefined>;
  /** The user's data views. */
  getDataViews: (scope: MaterializeScope) => Promise<DataViewsService>;
  /** The user's advanced settings. */
  getUiSettings: (scope: MaterializeScope) => IUiSettingsClient;
  /** The path to Kibana for the request's space, with the public origin when one is configured. */
  getKibanaUrl: (request: KibanaRequest) => string;
  now?: () => Date;
}

const openInKibana = () =>
  i18n.translate('xpack.isomer.materialize.dashboard.openInKibana', {
    defaultMessage: 'Open in Kibana',
  });

const noDashboardPlugin = () =>
  i18n.translate('xpack.isomer.materialize.dashboard.noDashboardPlugin', {
    defaultMessage: 'Dashboards are not available in this Kibana.',
  });

const describeDashboard = ({ state, resolved }: DashboardConfig): MaterializeDescription => ({
  ...(state.title ? { title: state.title } : {}),
  ...(resolved?.href ? { link: { href: resolved.href, label: openInKibana() } } : {}),
});

const placeholderFor =
  (description: MaterializeDescription) => (panel: ListedPanel, reason: string) =>
    createUnsupportedNode(reason, { title: panel.label, link: description.link });

/**
 * Materializes a dashboard into a charts pack `grid`: one `materialize` request per panel, run in
 * parallel, in the context Dashboard gives each panel. A panel that fails, or has no materializer,
 * is an `unsupported` placeholder in its place, and the dashboard still returns.
 */
export const createDashboardMaterializer = ({
  getDashboard,
  getDataViews,
  getUiSettings,
  getKibanaUrl,
  now = () => new Date(),
}: DashboardMaterializerDeps): Materializer<DashboardConfig> => ({
  version: 1,

  parse: parseDashboardConfig,

  load: async (id, { savedObjectsClient }) => {
    const dashboard = await getDashboard();
    if (!dashboard) {
      throw new Error(noDashboardPlugin());
    }
    return loadDashboard(dashboard.client, savedObjectsClient, id);
  },

  resolve: async (config, scope) => {
    let dataViews: Promise<DataViewsService> | undefined;
    const getDataView = async (dataViewId: string): Promise<DataView | undefined> => {
      dataViews ??= getDataViews(scope);
      return (await dataViews).get(dataViewId).catch(() => undefined);
    };
    const uiSettings = getUiSettings(scope);
    const [{ controlFilters, unappliedControls }, timeDefaults, timeZone] = await Promise.all([
      resolveControlFilters(dashboardControls(config), { getDataView }),
      config.state.time_range
        ? undefined
        : uiSettings.get<TimeRange | undefined>('timepicker:timeDefaults'),
      uiSettings.get<string | undefined>('dateFormat:tz'),
    ]);
    return {
      ...config,
      resolved: {
        controlFilters,
        unappliedControls,
        ...(timeDefaults ? { timeDefaults } : {}),
        ...(timeZone ? { timeZone } : {}),
        ...(config.id
          ? {
              href: `${getKibanaUrl(scope.request)}/app/dashboards#/view/${encodeURIComponent(
                config.id
              )}`,
            }
          : {}),
      },
    };
  },

  describe: describeDashboard,

  plan: (config, context) => {
    const dashboard = dashboardContext(config, dashboardControls(config), context, now());
    return allPanels(listDashboard(config)).flatMap((panel) =>
      'input' in panel.target
        ? [
            {
              kind: 'materialize' as const,
              input: panel.target.input,
              context: panelContext(dashboard, panel),
            },
          ]
        : []
    );
  },

  map: (config, { nodes }) => {
    const description = describeDashboard(config);
    return toGrid(config, listDashboard(config), nodes, placeholderFor(description), description);
  },
});
