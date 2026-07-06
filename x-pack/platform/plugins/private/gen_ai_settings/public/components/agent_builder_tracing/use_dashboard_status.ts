/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';

const DASHBOARD_ID_PREFIX = 'agent-builder-overview';
const QUERY_KEY = ['agentBuilderTracingDashboardStatus'];

export const useDashboardStatus = () => {
  const {
    services: { spaces, dashboard, genAiSettingsApi },
  } = useKibana();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const activeSpace = await spaces?.getActiveSpace();
      const spaceId = activeSpace?.id ?? 'default';
      const dashboardId = `${DASHBOARD_ID_PREFIX}-${spaceId}`;

      if (!dashboard) {
        return { installed: false, dashboardId };
      }

      const findService = await dashboard.findDashboardsService();
      const result = await findService.findById(dashboardId);
      return { installed: result.status === 'success', dashboardId };
    },
  });

  const { mutateAsync: installDashboard, isLoading: isInstalling } = useMutation({
    mutationFn: async () => {
      await genAiSettingsApi(
        'POST /internal/gen_ai_settings/agent_builder/sync_tracing_platform_features',
        { signal: null }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    isInstalled: data?.installed ?? false,
    dashboardId: data?.dashboardId ?? '',
    isLoading,
    isInstalling,
    installDashboard,
  };
};
