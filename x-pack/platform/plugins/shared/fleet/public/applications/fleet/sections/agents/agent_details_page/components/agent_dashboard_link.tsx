/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import styled from 'styled-components';

import type { GetInfoResponse } from '../../../../../../../common/types';
import {
  useGetPackageInfoByKeyQuery,
  useLink,
  useDashboardLocator,
  useFleetStatus,
} from '../../../../hooks';
import type { Agent, AgentPolicy } from '../../../../types';
import {
  FLEET_ELASTIC_AGENT_PACKAGE,
  DASHBOARD_LOCATORS_IDS,
} from '../../../../../../../common/constants';
import { getDashboardIdForSpace } from '../../services/dashboard_helpers';

function isKibanaAssetsInstalledInSpace(spaceId: string | undefined, res?: GetInfoResponse) {
  if (res?.item?.status !== 'installed') {
    return false;
  }

  const installationInfo = res.item.installationInfo;

  if (!installationInfo || installationInfo.install_status !== 'installed') {
    return false;
  }
  return (
    installationInfo.installed_kibana_space_id === spaceId ||
    (spaceId && installationInfo.additional_spaces_installed_kibana?.[spaceId])
  );
}

function useAgentDashboardLink(agent: Agent) {
  const { isLoading, data } = useGetPackageInfoByKeyQuery(FLEET_ELASTIC_AGENT_PACKAGE);
  const { spaceId } = useFleetStatus();

  const isInstalled = isKibanaAssetsInstalledInSpace(spaceId, data);
  const dashboardLocator = useDashboardLocator();

  const link = dashboardLocator?.getRedirectUrl({
    dashboardId: getDashboardIdForSpace(
      spaceId,
      data,
      DASHBOARD_LOCATORS_IDS.ELASTIC_AGENT_AGENT_METRICS
    ),
    query: {
      language: 'kuery',
      query: `elastic_agent.id:${agent.id}`,
    },
  });

  return {
    isLoading,
    isInstalled,
    link,
  };
}

const EuiButtonCompressed = styled(EuiButton)`
  height: 32px;
`;

export const AgentDashboardLink: React.FunctionComponent<{
  agent: Agent;
  agentPolicy?: AgentPolicy;
}> = ({ agent, agentPolicy }) => {
  const { isInstalled, link, isLoading } = useAgentDashboardLink(agent);
  const { getHref } = useLink();

  const isLogAndMetricsEnabled = agentPolicy?.monitoring_enabled?.length ?? 0 > 0;

  const buttonArgs =
    !isInstalled || isLoading || !isLogAndMetricsEnabled ? { disabled: true } : { href: link };

  const button = (
    <EuiButtonCompressed
      {...buttonArgs}
      isLoading={isLoading}
      color="primary"
      iconType="dashboardApp"
    >
      <FormattedMessage
        data-test-subj="agentDetails.viewMoreMetricsButton"
        id="xpack.fleet.agentDetails.viewDashboardButtonLabel"
        defaultMessage="View more agent metrics"
      />
    </EuiButtonCompressed>
  );

  if (!isLoading && !isLogAndMetricsEnabled && agentPolicy) {
    return (
      <EuiToolTip
        content={
          <FormattedMessage
            id="xpack.fleet.agentDetails.viewDashboardButton.disabledNoLogsAndMetricsTooltip"
            defaultMessage="Logs and metrics for agent are not enabled in the agent policy."
          />
        }
      >
        <EuiButtonCompressed
          data-test-subj="agentDetails.enableLogsAndMetricsButton"
          isLoading={isLoading}
          color="primary"
          href={getHref('policy_details', { policyId: agentPolicy.id, tabId: 'settings' })}
          disabled={agentPolicy?.is_managed}
        >
          <FormattedMessage
            id="xpack.fleet.agentDetails.enableLogsAndMetricsLabel"
            defaultMessage="Enable logs and metrics"
          />
        </EuiButtonCompressed>
      </EuiToolTip>
    );
  }

  if (!isInstalled) {
    return (
      <EuiToolTip
        content={
          <FormattedMessage
            id="xpack.fleet.agentDetails.viewDashboardButton.disabledNoIntegrationTooltip"
            defaultMessage="Agent dashboard not found, you need to install the elastic_agent integration."
          />
        }
      >
        {button}
      </EuiToolTip>
    );
  }

  return button;
};
