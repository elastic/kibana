/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { EuiStepStatus } from '@elastic/eui';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFlyoutFooter,
  EuiSteps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import { AGENTS_PREFIX, FLEET_CONNECTORS_PACKAGE, MAX_FLYOUT_WIDTH } from '../../constants';

import {
  useGetAgentsQuery,
  useStartServices,
  useGetPackageInfoByKeyQuery,
  useFleetStatus,
} from '../../hooks';
import { getDashboardsCount, buildDashboardsListLink } from '../../services';

import { AgentlessStepConfirmEnrollment } from './step_confirm_enrollment';
import { AgentlessStepConfirmData } from './step_confirm_data';
import { AgentlessStepConfigureConnector } from './step_configure_connector';
import { AgentlessStepViewDashboards } from './step_view_dashboards';
import type { AgentlessEnrollmentFlyoutProps } from './types';
import { resolveIntegrationTitle } from './utils';

// re-export the flyout contract types so external consumers can import them from this module
export type {
  AgentlessEnrollmentConnector,
  AgentlessEnrollmentSelectedInput,
  AgentlessEnrollmentFlyoutProps,
} from './types';

const REFRESH_INTERVAL_MS = 30000;

/**
 * This component displays additional status details of an agentless agent enrolled
 * into the chosen agentless policy (and its agent policy).
 * It also displays confirmation that the agentless agent is ingesting data.
 */
export const AgentlessEnrollmentFlyout = ({
  onClose,
  policyId,
  policyName,
  packageInfo,
  selectedInput,
  agentPolicy,
  connectors,
}: AgentlessEnrollmentFlyoutProps) => {
  const core = useStartServices();
  const { notifications } = core;
  const { spaceId = DEFAULT_SPACE_ID } = useFleetStatus();

  const [confirmEnrollmentStatus, setConfirmEnrollmentStatus] = useState<EuiStepStatus>('loading');
  const [confirmDataStatus, setConfirmDataStatus] = useState<EuiStepStatus>('disabled');
  const [viewDashboardsStatus, setViewDashboardsStatus] = useState<EuiStepStatus>('disabled');
  const [agentOnline, setAgentOnline] = useState(false);

  // Fetch agent for the policy identified by `policyId`, polling every 30s until online.
  const agentKuery = `${AGENTS_PREFIX}.policy_id: "${policyId}"`;
  const { data: agentsData } = useGetAgentsQuery(
    { kuery: agentKuery },
    { refetchInterval: agentOnline ? false : REFRESH_INTERVAL_MS }
  );
  const agentData = agentsData?.data?.items?.[0];
  const agentsError = agentsData?.error;

  useEffect(() => {
    if (agentsError) {
      notifications.toasts.addError(agentsError as Error, {
        title: i18n.translate(
          'xpack.fleet.epm.packageDetails.integrationList.agentlessStatusError',
          { defaultMessage: 'Error fetching managed integration status information' }
        ),
      });
    }
  }, [agentsError, notifications.toasts]);

  // Derive step statuses from agent status; stop polling once the agent is online.
  // Once online, ignore subsequent poll results so transient errors or refetchOnWindowFocus
  // can't reset completed steps back to loading.
  useEffect(() => {
    if (agentOnline) return;
    if (agentData) {
      if (agentData.status === 'online') {
        setAgentOnline(true);
        setConfirmEnrollmentStatus('complete');
        setConfirmDataStatus('loading');
      } else if (agentData.status === 'error' || agentData.status === 'degraded') {
        setConfirmEnrollmentStatus('danger');
        setConfirmDataStatus('disabled');
      } else {
        setConfirmEnrollmentStatus('loading');
        setConfirmDataStatus('disabled');
      }
    } else {
      setConfirmEnrollmentStatus('loading');
      setConfirmDataStatus('disabled');
    }
  }, [agentOnline, agentData]);

  // Activate the "View dashboards" step as soon as data is confirmed
  useEffect(() => {
    if (confirmDataStatus === 'complete') {
      setViewDashboardsStatus('complete');
    } else {
      setViewDashboardsStatus('disabled');
    }
  }, [confirmDataStatus]);

  // Calculate integration title from the base package info
  const { data: packageInfoData } = useGetPackageInfoByKeyQuery(
    packageInfo.name,
    packageInfo.version,
    {
      prerelease: true,
    }
  );

  const integrationTitle = useMemo(
    () =>
      resolveIntegrationTitle({
        packageTitle: packageInfoData?.item?.title,
        policyTemplates: packageInfoData?.item?.policy_templates,
        selectedInput,
        fallbackName: policyName,
      }),
    [packageInfoData, selectedInput, policyName]
  );

  // Connector integrations don't ingest data until the connector is configured,
  // so the "Confirm incoming data" step is reframed as a connector setup step.
  const isConnector = packageInfo.name === FLEET_CONNECTORS_PACKAGE;

  // Compute dashboards availability and link for the 3rd step.
  // Only shown for non-connector integrations that actually ship dashboards.
  const dashboardsCount = useMemo(() => {
    const installationInfo = packageInfoData?.item?.installationInfo;
    if (!installationInfo) return 0;
    return getDashboardsCount(installationInfo, spaceId);
  }, [packageInfoData, spaceId]);

  const dashboardsLink = useMemo(() => {
    const title = packageInfoData?.item?.title;
    if (!title) return undefined;
    return buildDashboardsListLink(core.http.basePath, title);
  }, [packageInfoData, core.http.basePath]);

  const showDashboardsStep = !isConnector && dashboardsCount > 0;

  return (
    <EuiFlyout
      data-test-subj="agentlessEnrollmentFlyout"
      onClose={onClose}
      maxWidth={MAX_FLYOUT_WIDTH}
      aria-labelledby="FleetAgentlessEnrollmentFlyoutTitle"
    >
      <EuiFlyoutHeader hasBorder aria-labelledby="FleetAgentlessEnrollmentFlyoutTitle">
        <EuiTitle size="m">
          <h2 id="FleetAgentlessEnrollmentFlyoutTitle">{policyName}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiSteps
          steps={[
            {
              title: i18n.translate(
                'xpack.fleet.agentlessEnrollmentFlyout.stepConfirmEnrollmentTitle',
                {
                  defaultMessage: 'Confirm managed integration enrollment',
                }
              ),
              children: (
                <AgentlessStepConfirmEnrollment
                  agent={agentData}
                  agentPolicy={agentPolicy}
                  integrationTitle={integrationTitle}
                />
              ),
              status: confirmEnrollmentStatus,
            },
            {
              title: isConnector
                ? i18n.translate(
                    'xpack.fleet.agentlessEnrollmentFlyout.stepConfigureConnectorTitle',
                    {
                      defaultMessage: 'Configure connector',
                    }
                  )
                : i18n.translate('xpack.fleet.agentlessEnrollmentFlyout.stepConfirmDataTitle', {
                    defaultMessage: 'Confirm incoming data',
                  }),
              children:
                agentData && confirmEnrollmentStatus === 'complete' ? (
                  isConnector ? (
                    <AgentlessStepConfigureConnector
                      connectors={connectors}
                      policyName={policyName}
                      policyTemplates={packageInfoData?.item?.policy_templates}
                      setStepStatus={setConfirmDataStatus}
                      onClose={onClose}
                    />
                  ) : (
                    <AgentlessStepConfirmData
                      agent={agentData}
                      packageName={packageInfo.name}
                      packageVersion={packageInfo.version}
                      policyTemplates={packageInfoData?.item?.policy_templates}
                      setConfirmDataStatus={setConfirmDataStatus}
                    />
                  )
                ) : (
                  <></> // Avoids React error about null children prop
                ),
              status: confirmDataStatus,
            },
            ...(showDashboardsStep && dashboardsLink
              ? [
                  {
                    title: i18n.translate(
                      'xpack.fleet.agentlessEnrollmentFlyout.stepViewDashboardsTitle',
                      {
                        defaultMessage: 'View dashboards',
                      }
                    ),
                    children:
                      viewDashboardsStatus === 'complete' ? (
                        <AgentlessStepViewDashboards dashboardsLink={dashboardsLink} />
                      ) : (
                        <></>
                      ),
                    status: viewDashboardsStatus,
                  },
                ]
              : []),
          ]}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              <FormattedMessage
                id="xpack.fleet.agentlessEnrollmentFlyout.closeFlyoutButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
