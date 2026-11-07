/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import {
  attachmentDataToDashboardState,
  dashboardStateToAttachmentData,
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import {
  DASHBOARD_SKELETON_EMBEDDABLE_TYPE,
  SKELETON_PANEL_ID_PREFIX,
  type DashboardBuildPlannedPanel,
  type DashboardPanelResolvedUiEventData,
} from '../../../common';

const GRID_COLUMNS = 48;
const RENDER_BATCH_MS = 60;

const SIZE_BY_CHART_TYPE: Record<string, { w: number; h: number }> = {
  metric: { w: 12, h: 8 },
  gauge: { w: 12, h: 8 },
  datatable: { w: GRID_COLUMNS, h: 14 },
};
const DEFAULT_SIZE = { w: 24, h: 14 };

/** Whether a live build is on screen, so the dashboard should not be synced back as an attachment. */
export const liveBuildActive$ = new BehaviorSubject<boolean>(false);

interface BuildEntry {
  id: string;
  label: string;
  chartType?: string;
  grid: AttachmentPanel['grid'];
  resolved?: Pick<AttachmentPanel, 'type' | 'config'>;
  failed?: boolean;
}

const getContentBottom = (panels: DashboardAttachmentData['panels']): number =>
  panels.reduce((bottom, widget) => {
    if (!isSection(widget)) return Math.max(bottom, widget.grid.y + widget.grid.h);
    const sectionContentBottom = widget.collapsed
      ? 0
      : widget.panels.reduce(
          (sectionBottom, { grid }) => Math.max(sectionBottom, grid.y + grid.h),
          0
        );
    return Math.max(bottom, widget.grid.y + 1 + sectionContentBottom);
  }, 0);

/** Packs the planned panels left to right in rows below the existing content. */
const packProvisionalGrids = (
  planned: DashboardBuildPlannedPanel[],
  startY: number
): BuildEntry[] => {
  let x = 0;
  let y = startY;
  let rowHeight = 0;
  return planned.map(({ id, label, chartType }) => {
    const { w, h } = (chartType && SIZE_BY_CHART_TYPE[chartType]) || DEFAULT_SIZE;
    if (x + w > GRID_COLUMNS) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }
    const entry: BuildEntry = { id, label, chartType, grid: { x, y, w, h } };
    x += w;
    rowHeight = Math.max(rowHeight, h);
    return entry;
  });
};

/**
 * Shows a dashboard being built on the open dashboard: a skeleton per planned panel, each swapped
 * for the real panel (at the same place) as it resolves. The final `dashboard:updated` state always
 * replaces it, see `finish`.
 */
export const createLiveBuild = ({ api }: { api: DashboardApi }) => {
  let base: DashboardAttachmentData | undefined;
  let title: string | undefined;
  let entries: BuildEntry[] = [];
  let renderTimeout: ReturnType<typeof setTimeout> | undefined;

  const render = () => {
    renderTimeout = undefined;
    if (!base) return;
    const buildPanels = entries.flatMap(
      ({ id, label, chartType, grid, resolved, failed }): AttachmentPanel[] => {
        if (failed) return [];
        return resolved
          ? [{ ...resolved, id, grid }]
          : [
              {
                type: DASHBOARD_SKELETON_EMBEDDABLE_TYPE,
                id: `${SKELETON_PANEL_ID_PREFIX}${id}`,
                config: { title: label, chart_type: chartType },
                grid,
              },
            ];
      }
    );
    api.setState(
      attachmentDataToDashboardState({
        ...base,
        title: title ?? base.title,
        panels: [...base.panels, ...buildPanels],
      }),
      { changedBy: ['agent'] }
    );
  };

  const scheduleRender = () => {
    if (renderTimeout === undefined) renderTimeout = setTimeout(render, RENDER_BATCH_MS);
  };

  const cancelRender = () => {
    if (renderTimeout !== undefined) clearTimeout(renderTimeout);
    renderTimeout = undefined;
  };

  const finish = () => {
    cancelRender();
    base = undefined;
    entries = [];
    liveBuildActive$.next(false);
  };

  return {
    start: ({
      planned,
      title: plannedTitle,
    }: {
      planned: DashboardBuildPlannedPanel[];
      title: string;
    }) => {
      base = dashboardStateToAttachmentData(api.getSerializedState().attributes);
      title = plannedTitle;
      entries = packProvisionalGrids(planned, getContentBottom(base.panels));
      liveBuildActive$.next(true);
      render();
    },
    resolvePanel: ({
      panelId,
      panel,
    }: Pick<DashboardPanelResolvedUiEventData, 'panelId' | 'panel'>) => {
      const entry = entries.find(({ id }) => id === panelId);
      if (!entry) return;
      if (panel) entry.resolved = panel;
      else entry.failed = true;
      scheduleRender();
    },
    /** The final dashboard is about to be applied, which replaces everything shown so far. */
    finish,
    /** The run ended without a final dashboard: drops the skeletons that never resolved. */
    end: () => {
      if (!base) return;
      entries = entries.filter(({ resolved }) => resolved);
      cancelRender();
      render();
      finish();
    },
  };
};
