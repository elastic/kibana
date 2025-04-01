/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQuery } from '@tanstack/react-query';

import {
  DASHBOARD_LOCATORS_IDS,
  FLEET_ELASTIC_AGENT_PACKAGE,
} from '../../../../../../../common/constants';

import {
  useDashboardLocator,
  useFleetStatus,
  useGetPackageInfoByKeyQuery,
  useStartServices,
} from '../../../../hooks';

import { getDashboardIdForSpace } from '../../services/dashboard_helpers';

const useDashboardExists = (dashboardId: string) => {
  const { dashboard: dashboardPlugin } = useStartServices();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard_exists', dashboardId],
    queryFn: async () => {
      try {
        const findDashboardsService = await dashboardPlugin.findDashboardsService();
        const [dashboard] = await findDashboardsService.findByIds([dashboardId]);
        return dashboard?.status === 'success';
      } catch (e) {
        return false;
      }
    },
  });
  return { dashboardExists: data ?? false, loading: isLoading };
};

export const DashboardsButtons: React.FunctionComponent = () => {
  const { data } = useGetPackageInfoByKeyQuery(FLEET_ELASTIC_AGENT_PACKAGE);
  const { spaceId } = useFleetStatus();

  const dashboardLocator = useDashboardLocator();

  const getDashboardHref = (dashboardId: string) => {
    return dashboardLocator?.getRedirectUrl({ dashboardId }) || '';
  };

  const elasticAgentOverviewDashboardId = getDashboardIdForSpace(
    spaceId,
    data,
    DASHBOARD_LOCATORS_IDS.ELASTIC_AGENT_OVERVIEW
  );

  const elasticAgentInfoDashboardId = getDashboardIdForSpace(
    spaceId,
    data,
    DASHBOARD_LOCATORS_IDS.ELASTIC_AGENT_AGENT_INFO
  );

  const { dashboardExists, loading: dashboardLoading } = useDashboardExists(
    elasticAgentOverviewDashboardId
  );

  if (dashboardLoading || !dashboardExists) {
    return null;
  }

  return (
    <>
      <EuiFlexGroup gutterSize="s" justifyContent="flexStart">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="dashboardApp"
            href={getDashboardHref(elasticAgentOverviewDashboardId)}
            data-test-subj="ingestOverviewLinkButton"
          >
            <FormattedMessage
              id="xpack.fleet.agentList.ingestOverviewlinkButton"
              defaultMessage="Ingest Overview Metrics"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="dashboardApp"
            href={getDashboardHref(elasticAgentInfoDashboardId)}
            data-test-subj="agentInfoLinkButton"
          >
            <FormattedMessage
              id="xpack.fleet.agentList.agentInfoLinkButton"
              defaultMessage="Agent Info Metrics"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
