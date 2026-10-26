/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, omit } from 'lodash';
import type { IBasePath, KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { addSpaceIdToPath } from '@kbn/core-spaces-common';
import { DASHBOARD_APP_ID } from '@kbn/deeplinks-analytics';
import type { ModelProvider } from '@kbn/agent-builder-server';
import type { DashboardPanel, DashboardState } from '@kbn/as-code-dashboard-schema';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import {
  attachmentDataToSavedDashboardState,
  dashboardStateToAttachmentData,
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { getErrorMessage } from '@kbn/dashboard-agent-authoring';
import type { DashboardReference, DashboardStore, LoadedDashboard } from './dashboard_store';

type DashboardReadResponseBody = Awaited<ReturnType<DashboardPluginStart['client']['read']>>;

export interface SavedObjectDashboardStoreDeps {
  dashboardClient: DashboardPluginStart['client'];
  savedObjectsClient: SavedObjectsClientContract;
  request: KibanaRequest;
  spaceId: string;
  basePath: Pick<IBasePath, 'publicBaseUrl' | 'serverBasePath'>;
  modelProvider: ModelProvider;
  /** Whether the Dashboard app takes Lens panels in the Lens API format (Lens as code). */
  lensApiFormat: boolean;
}

const getNoModelErrorMessage = (cause: string) =>
  `No AI connector is available (${cause}). This tool needs one to build panels and lay out the dashboard. Configure an AI connector in Kibana, or pass \`connector_id\` to \`tools/_execute\`.`;

const attachmentPanelUnavailableMessage =
  '`source: "attachment"` panels need an Agent Builder conversation. Use `source: "request"` or `source: "config"` instead.';

const readDashboard = async (
  dashboardClient: DashboardPluginStart['client'],
  savedObjectsClient: SavedObjectsClientContract,
  dashboardId: string
): Promise<DashboardReadResponseBody> => {
  try {
    return await dashboardClient.read(savedObjectsClient, dashboardId, {
      isDashboardAppRequest: true,
    });
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      throw new Error(`Dashboard "${dashboardId}" not found.`);
    }
    throw error;
  }
};

const describeDroppedContent = ({ warnings = [] }: DashboardReadResponseBody) => {
  const panelTypes = new Set<string>();
  const properties = new Set<string>();
  for (const warning of warnings) {
    switch (warning.type) {
      case 'dropped_panel':
        panelTypes.add(warning.panel_type);
        break;
      case 'dropped_property':
        properties.add(warning.key);
        break;
      default: {
        const unhandled: never = warning;
        throw new Error(`Unhandled dashboard read warning: ${JSON.stringify(unhandled)}`);
      }
    }
  }
  const parts = [
    ...(panelTypes.size > 0 ? [`panel types: ${[...panelTypes].join(', ')}`] : []),
    ...(properties.size > 0 ? [`properties: ${[...properties].join(', ')}`] : []),
  ];
  return parts.length > 0 ? parts.join('; ') : undefined;
};

const getDashboardPanels = (widgets: DashboardState['panels']): DashboardPanel[] =>
  widgets.flatMap((widget) => ('panels' in widget ? widget.panels : [widget]));

const getAttachmentPanels = (widgets: DashboardAttachmentData['panels']): AttachmentPanel[] =>
  widgets.flatMap((widget) => (isSection(widget) ? widget.panels : [widget]));

const indexById = <Panel extends { id?: string }>(panels: Panel[]): Map<string, Panel> =>
  new Map(panels.flatMap((panel) => (panel.id === undefined ? [] : [[panel.id, panel]])));

/**
 * Puts back the stored form of every loaded panel the call did not change, so converting it to
 * the attachment form and back cannot alter it. Only its grid is taken from the new dashboard.
 */
const restoreUnchangedPanels = (
  dashboardState: DashboardState,
  data: DashboardAttachmentData,
  existing: LoadedDashboard,
  storedPanels: Map<string, DashboardPanel>
): DashboardState => {
  const loadedPanels = indexById(getAttachmentPanels(existing.data.panels));
  const savedPanels = indexById(getAttachmentPanels(data.panels));
  const restorePanel = (panel: DashboardPanel): DashboardPanel => {
    if (panel.id === undefined) {
      return panel;
    }
    const storedPanel = storedPanels.get(panel.id);
    const loadedPanel = loadedPanels.get(panel.id);
    const savedPanel = savedPanels.get(panel.id);
    const isUnchanged =
      loadedPanel !== undefined &&
      savedPanel !== undefined &&
      isEqual(omit(loadedPanel, 'grid'), omit(savedPanel, 'grid'));
    return storedPanel && isUnchanged ? { ...storedPanel, grid: panel.grid } : panel;
  };
  return {
    ...dashboardState,
    panels: dashboardState.panels.map((widget) =>
      'panels' in widget
        ? { ...widget, panels: widget.panels.map(restorePanel) }
        : restorePanel(widget)
    ),
  };
};

export const createSavedObjectDashboardStore = async ({
  dashboardClient,
  savedObjectsClient,
  request,
  spaceId,
  basePath,
  modelProvider,
  lensApiFormat,
}: SavedObjectDashboardStoreDeps): Promise<DashboardStore> => {
  try {
    await modelProvider.getDefaultModel();
  } catch (error) {
    throw new Error(getNoModelErrorMessage(getErrorMessage(error)));
  }

  const toReference = (id: string): DashboardReference => ({
    dashboard_id: id,
    url: addSpaceIdToPath(
      basePath.publicBaseUrl ?? basePath.serverBasePath,
      spaceId,
      `/app/${DASHBOARD_APP_ID}#/view/${encodeURIComponent(id)}`
    ),
  });

  const storedPanelsByDashboardId = new Map<string, Map<string, DashboardPanel>>();

  return {
    load: async (dashboardId) => {
      const body = await readDashboard(dashboardClient, savedObjectsClient, dashboardId);
      const droppedContent = describeDroppedContent(body);
      if (droppedContent) {
        throw new Error(
          `Dashboard "${dashboardId}" contains content this tool cannot preserve (${droppedContent}), so saving it would remove that content. Nothing was changed. The dashboard can still be edited in Kibana.`
        );
      }
      storedPanelsByDashboardId.set(body.id, indexById(getDashboardPanels(body.data.panels)));
      return {
        id: body.id,
        data: dashboardStateToAttachmentData(body.data),
        reference: toReference(body.id),
      };
    },
    save: async (data, existing) => {
      const dashboardState = attachmentDataToSavedDashboardState(data, { lensApiFormat });
      const storedPanels = existing && storedPanelsByDashboardId.get(existing.id);
      const savedState =
        existing && storedPanels
          ? restoreUnchangedPanels(dashboardState, data, existing, storedPanels)
          : dashboardState;
      const options = { isDashboardAppRequest: true };
      const { id } = existing
        ? await dashboardClient.update(request, existing.id, savedState, options)
        : await dashboardClient.create(request, savedState, options);
      return toReference(id);
    },
    resolveAttachmentPanel: () => ({ type: 'failure', error: attachmentPanelUnavailableMessage }),
  };
};
