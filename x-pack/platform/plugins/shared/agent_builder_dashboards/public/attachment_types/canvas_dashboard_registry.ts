/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardApi } from '@kbn/dashboard-plugin/public';

export interface CanvasDashboard {
  /** The dashboard attachment the canvas renders. */
  attachmentId: string;
  /** Set when the canvas covers the chat input (in the sidebar), so it must close to show it. */
  closeCanvas?: () => void;
}

export interface CanvasDashboardRegistry {
  /** Records a dashboard rendered in the canvas; the returned callback removes it. */
  register: (api: DashboardApi, canvasDashboard: CanvasDashboard) => () => void;
  get: (api: unknown) => CanvasDashboard | undefined;
}

/** Tracks the dashboards rendered in the chat canvas and the dashboard attachment each one shows. */
export const createCanvasDashboardRegistry = (): CanvasDashboardRegistry => {
  const canvasDashboards = new Map<unknown, CanvasDashboard>();
  return {
    register: (api, canvasDashboard) => {
      canvasDashboards.set(api, canvasDashboard);
      return () => {
        if (canvasDashboards.get(api) === canvasDashboard) {
          canvasDashboards.delete(api);
        }
      };
    },
    get: (api) => canvasDashboards.get(api),
  };
};
