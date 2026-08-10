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

import { AGENTS_PREFIX, FLEET_CONNECTORS_PACKAGE, MAX_FLYOUT_WIDTH } from '../../constants';

import { useGetAgentsQuery, useGetPackageInfoByKeyQuery } from '../../hooks';
import { buildPolicyBaseIdWithFallbackKuery } from '../../../common/services';

import { AgentlessStepConfirmEnrollment } from './step_confirm_enrollment';
import { AgentlessStepConfirmData } from './step_confirm_data';
import { AgentlessStepConfigureConnector } from './step_configure_connector';
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
  const [confirmEnrollmentStatus, setConfirmEnrollmentStatus] = useState<EuiStepStatus>('loading');
  const [confirmDataStatus, setConfirmDataStatus] = useState<EuiStepStatus>('disabled');
  const [agentOnline, setAgentOnline] = useState(false);

  // Fetch agent for the policy identified by `policyId` (including version-specific variants,
  // e.g. `policyId#9.2`), polling every 30s until online.
  const agentKuery = buildPolicyBaseIdWithFallbackKuery(
    policyId,
    `${AGENTS_PREFIX}.policy_base_id`,
    `${AGENTS_PREFIX}.policy_id`
  );
  const { data: agentsData } = useGetAgentsQuery(
    { kuery: agentKuery },
    { refetchInterval: agentOnline ? false : REFRESH_INTERVAL_MS }
  );
  const agentData = agentsData?.data?.items?.[0];

  // Watches agent data and updates step statuses; stops polling when agent is online
  useEffect(() => {
    if (agentData) {
      if (agentData.status === 'online') {
        setConfirmEnrollmentStatus('complete');
        setConfirmDataStatus('loading');
        setAgentOnline(true);
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
  }, [agentData]);

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
