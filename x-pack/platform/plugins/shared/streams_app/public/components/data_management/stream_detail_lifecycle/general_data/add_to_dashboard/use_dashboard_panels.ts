/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useKibana } from '../../../../../hooks/use_kibana';
import { STREAM_METRICS_EMBEDDABLE_ID } from '../../../../../../common/embeddable';

export interface DashboardItem {
  id: string;
  title: string;
}

export interface DashboardWithStreamPanel extends DashboardItem {
  hasStreamMetricsPanel: boolean;
}

export function useDashboardPanels({ streamName }: { streamName: string }) {
  const {
    core: { http },
  } = useKibana();

  const [dashboards, setDashboards] = useState<DashboardItem[]>([]);
  const [dashboardsWithPanel, setDashboardsWithPanel] = useState<DashboardWithStreamPanel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingWithPanel, setIsLoadingWithPanel] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  // Search for all available dashboards
  const searchDashboards = useCallback(
    async (searchTerm?: string) => {
      setIsLoading(true);
      setError(undefined);

      try {
        const response = await http.post<{
          dashboards: Array<{
            id: string;
            data: { title: string };
          }>;
        }>('/api/dashboards/search', {
          version: '1',
          body: JSON.stringify({
            search: searchTerm ? `${searchTerm}*` : undefined,
            per_page: 100,
          }),
        });

        const items: DashboardItem[] = response.dashboards.map((d) => ({
          id: d.id,
          title: d.data.title,
        }));

        setDashboards(items);
        return items;
      } catch (e) {
        setError(e);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [http]
  );

  // Find dashboards that contain the stream metrics panel for this stream
  const findDashboardsWithStreamPanel = useCallback(async () => {
    setIsLoadingWithPanel(true);

    try {
      // First get all dashboards
      const response = await http.post<{
        dashboards: Array<{
          id: string;
          data: { title: string; panels?: Record<string, unknown> };
        }>;
      }>('/api/dashboards/search', {
        version: '1',
        body: JSON.stringify({
          per_page: 1000,
        }),
      });

      // For each dashboard, we need to check if it has the stream metrics panel
      // We'll fetch the full dashboard to check the panels
      const dashboardsWithPanelPromises = response.dashboards.map(async (dashboard) => {
        try {
          const fullDashboard = await http.get<{
            data: {
              title: string;
              panels?: Array<{
                type: string;
                config?: {
                  streamName?: string;
                };
              }>;
            };
          }>(`/api/dashboards/${dashboard.id}`, {
            version: '1',
            query: { allowUnmappedKeys: true },
          });

          const hasStreamMetricsPanel = fullDashboard.data.panels?.some(
            (panel) =>
              panel.type === STREAM_METRICS_EMBEDDABLE_ID &&
              panel.config?.streamName === streamName
          );

          return {
            id: dashboard.id,
            title: fullDashboard.data.title,
            hasStreamMetricsPanel: Boolean(hasStreamMetricsPanel),
          };
        } catch {
          return {
            id: dashboard.id,
            title: dashboard.data.title,
            hasStreamMetricsPanel: false,
          };
        }
      });

      const results = await Promise.all(dashboardsWithPanelPromises);
      const withPanel = results.filter((d) => d.hasStreamMetricsPanel);
      setDashboardsWithPanel(withPanel);
      return withPanel;
    } catch (e) {
      setError(e);
      return [];
    } finally {
      setIsLoadingWithPanel(false);
    }
  }, [http, streamName]);

  // Initial load
  useEffect(() => {
    searchDashboards();
    findDashboardsWithStreamPanel();
  }, [searchDashboards, findDashboardsWithStreamPanel]);

  return {
    dashboards,
    dashboardsWithPanel,
    isLoading,
    isLoadingWithPanel,
    error,
    searchDashboards,
    refreshDashboardsWithPanel: findDashboardsWithStreamPanel,
  };
}
