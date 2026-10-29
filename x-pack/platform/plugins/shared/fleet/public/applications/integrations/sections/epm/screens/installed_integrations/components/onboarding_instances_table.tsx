/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@kbn/react-query';
import {
  EuiBasicTable,
  EuiCallOut,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedRelative } from '@kbn/i18n-react';

import type {
  CloudOnboardingDeploymentListItem,
  DeploymentMethod,
} from '../../../../../../../../common/types';
import {
  sendDeleteCloudOnboardingDeployment,
  useAuthz,
  useLink,
  useStartServices,
} from '../../../../../../../hooks';
import { AGENTS_PREFIX } from '../../../../../../../../common/constants';
import { buildPolicyBaseIdsWithFallbackKuery } from '../../../../../../../../common/services';
import {
  ONBOARDING_APP_ID,
  ONBOARDING_AWS_PATH,
} from '../../../../../../../services/aws_onboarding_override';

import { useOnboardingInstancesAgents } from '../hooks/use_onboarding_instances_agents';
import type { OnboardingInstanceAgent } from '../hooks/use_onboarding_instances_agents';

import { DeleteOnboardingInstanceModal } from './delete_onboarding_instance_modal';
import { OnboardingInstanceAgentFlyout } from './onboarding_instance_agent_flyout';
import { OnboardingInstanceStatusCell } from './onboarding_instance_status_cell';

const EMPTY_CELL = '-';

const getOnboardingInstanceName = (item: CloudOnboardingDeploymentListItem) =>
  item.integrationName || item.deploymentName || item.id;

const DEPLOYMENT_METHOD_LABELS: Record<DeploymentMethod, string> = {
  managed_integration: i18n.translate(
    'xpack.fleet.epmInstalledIntegrations.instances.managedIntegrationMethod',
    { defaultMessage: 'Managed integration' }
  ),
  ecf: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.ecfMethod', {
    defaultMessage: 'Elastic Cloud Forwarder',
  }),
  agent_based: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.agentBasedMethod', {
    defaultMessage: 'Agent-based',
  }),
};

/** Services named in a Services tooltip before the rest are only counted. */
const MAX_TOOLTIP_SERVICES = 3;

/** `<method>: A, B, C and 2 more services`. */
const getServicesTooltip = (method: DeploymentMethod, serviceNames: string[]): string => {
  const named = serviceNames.slice(0, MAX_TOOLTIP_SERVICES).join(', ');
  const moreCount = serviceNames.length - MAX_TOOLTIP_SERVICES;
  const services =
    moreCount > 0
      ? i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.moreServices', {
          defaultMessage:
            '{named} and {moreCount, plural, one {# more service} other {# more services}}',
          values: { named, moreCount },
        })
      : named;
  return `${DEPLOYMENT_METHOD_LABELS[method]}: ${services}`;
};

const DEPLOYMENT_METHOD_ORDER: DeploymentMethod[] = ['managed_integration', 'ecf', 'agent_based'];

/** Values side by side as `a / b`, each with its own tooltip, like the agent counts of Agent policies. */
const SlashSeparatedValues: React.FunctionComponent<{
  values: Array<{ key: string; value: React.ReactNode; tooltip: React.ReactNode }>;
}> = ({ values }) => {
  if (values.length === 0) return <>{EMPTY_CELL}</>;
  return (
    <>
      {values.map(({ key, value, tooltip }, index) => (
        <React.Fragment key={key}>
          {index > 0 ? ' / ' : null}
          <EuiToolTip content={tooltip}>
            <span tabIndex={0}>{value}</span>
          </EuiToolTip>
        </React.Fragment>
      ))}
    </>
  );
};

export const OnboardingInstancesTable: React.FunctionComponent<{
  onboardingInstances: CloudOnboardingDeploymentListItem[];
  /** The package being viewed, whose deployed version the Version column shows. */
  packageName: string;
  isLoading?: boolean;
}> = ({ onboardingInstances, packageName, isLoading = false }) => {
  const { application, notifications } = useStartServices();
  const authz = useAuthz();
  const { getHref } = useLink();
  // Matches the authz of DELETE /api/fleet/cloud_onboarding_deployments/{id}.
  const canDelete = authz.fleet.allAgentPolicies || authz.integrations.all;
  const canReadAgents = authz.fleet.readAgents;
  const {
    agentsByOnboardingInstance,
    agentPolicyIdsByOnboardingInstance,
    isTruncated: isAgentsTruncated,
    isLoading: isAgentsLoading,
    error: agentsError,
  } = useOnboardingInstancesAgents(onboardingInstances, { enabled: canReadAgents });
  const [flyoutAgent, setFlyoutAgent] = useState<OnboardingInstanceAgent | null>(null);

  useEffect(() => {
    if (!agentsError) return;
    notifications.toasts.addError(agentsError, {
      title: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.statusError', {
        defaultMessage: 'Could not load the agent status of the instances',
      }),
    });
  }, [agentsError, notifications.toasts]);
  const queryClient = useQueryClient();
  const [onboardingInstanceToDelete, setOnboardingInstanceToDelete] =
    useState<CloudOnboardingDeploymentListItem | null>(null);

  const deleteOnboardingInstance = useCallback(
    async (onboardingInstance: CloudOnboardingDeploymentListItem) => {
      try {
        await sendDeleteCloudOnboardingDeployment(onboardingInstance.id);
        notifications.toasts.addSuccess(
          i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.deleteSuccess', {
            defaultMessage: 'Deleted instance {onboardingInstanceName}',
            values: { onboardingInstanceName: getOnboardingInstanceName(onboardingInstance) },
          })
        );
        setOnboardingInstanceToDelete(null);
        await queryClient.invalidateQueries({ queryKey: ['cloud_onboarding_deployments'] });
      } catch (error) {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.deleteError', {
            defaultMessage: 'Could not delete instance {onboardingInstanceName}',
            values: { onboardingInstanceName: getOnboardingInstanceName(onboardingInstance) },
          }),
        });
      }
    },
    [notifications, queryClient]
  );

  // No `newSession` state: `deploymentId` makes the onboarding app hydrate from that session.
  const openOnboardingInstance = useCallback(
    (deploymentId: string) => {
      application.navigateToApp(ONBOARDING_APP_ID, {
        path: `${ONBOARDING_AWS_PATH}?deploymentId=${encodeURIComponent(deploymentId)}`,
      });
    },
    [application]
  );

  const columns: Array<EuiBasicTableColumn<CloudOnboardingDeploymentListItem>> = [
    {
      field: 'integrationName',
      name: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.nameColumn', {
        defaultMessage: 'Instance',
      }),
      render: (_: unknown, item: CloudOnboardingDeploymentListItem) => (
        <EuiLink onClick={() => openOnboardingInstance(item.id)} data-test-subj="instanceLink">
          {getOnboardingInstanceName(item)}
        </EuiLink>
      ),
    },
    {
      name: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.servicesColumn', {
        defaultMessage: 'Services',
      }),
      render: (item: CloudOnboardingDeploymentListItem) => (
        <SlashSeparatedValues
          values={DEPLOYMENT_METHOD_ORDER.flatMap((method) => {
            const serviceIds = item.servicesByMethod[method] ?? [];
            if (serviceIds.length === 0) return [];
            return [
              {
                key: method,
                value: serviceIds.length,
                tooltip: getServicesTooltip(
                  method,
                  serviceIds.map((id) => item.serviceNames?.[id] ?? id)
                ),
              },
            ];
          })}
        />
      ),
    },
    {
      name: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.versionColumn', {
        defaultMessage: 'Version',
      }),
      render: (item: CloudOnboardingDeploymentListItem) =>
        item.packages.find((pkg) => pkg.name === packageName)?.version ?? EMPTY_CELL,
    },
    {
      field: 'updatedBy',
      name: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.updatedByColumn', {
        defaultMessage: 'Last updated by',
      }),
      render: (updatedBy?: string) => updatedBy ?? EMPTY_CELL,
    },
    {
      field: 'updatedAt',
      name: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.updatedAtColumn', {
        defaultMessage: 'Last updated',
      }),
      render: (updatedAt?: string) =>
        updatedAt ? (
          <>
            <FormattedRelative value={new Date(updatedAt)} /> (
            <FormattedDate value={updatedAt} year="numeric" month="short" day="numeric" />)
          </>
        ) : (
          EMPTY_CELL
        ),
    },
    ...(canReadAgents
      ? [
          {
            name: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.statusColumn', {
              defaultMessage: 'Status',
            }),
            render: (item: CloudOnboardingDeploymentListItem) =>
              isAgentsLoading ? (
                <EuiLoadingSpinner size="s" />
              ) : (
                <OnboardingInstanceStatusCell
                  agents={agentsByOnboardingInstance.get(item.id) ?? []}
                  onOpen={setFlyoutAgent}
                />
              ),
          },
          {
            field: 'agentCount',
            name: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.agentsColumn', {
              defaultMessage: 'Agents',
            }),
            render: (agentCount: number | undefined, item: CloudOnboardingDeploymentListItem) => {
              if (!agentCount) return EMPTY_CELL;
              const agentPolicyIds = agentPolicyIdsByOnboardingInstance.get(item.id) ?? [];
              // Only agent-based agents: the Fleet agent list hides agentless ones unless an
              // agentless resources toggle is on, so a managed instance would open an empty list.
              // Their status badge opens the details of each agent instead.
              if (!item.mechanisms.includes('agent_based') || agentPolicyIds.length === 0) {
                return agentCount;
              }
              // Base ids with a fallback, like the agent count, so agents on version-specific
              // policies (`<id>#9.3`) are listed too.
              const kuery = buildPolicyBaseIdsWithFallbackKuery(
                agentPolicyIds,
                `${AGENTS_PREFIX}.policy_base_id`,
                `${AGENTS_PREFIX}.policy_id`
              );
              return (
                <EuiLink
                  href={getHref('agent_list', { kuery })}
                  data-test-subj="instanceAgentsLink"
                >
                  {agentCount}
                </EuiLink>
              );
            },
          },
        ]
      : []),
    ...(canDelete
      ? [
          {
            name: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.actionsColumn', {
              defaultMessage: 'Actions',
            }),
            actions: [
              {
                name: i18n.translate(
                  'xpack.fleet.epmInstalledIntegrations.instances.deleteAction',
                  { defaultMessage: 'Delete instance' }
                ),
                description: i18n.translate(
                  'xpack.fleet.epmInstalledIntegrations.instances.deleteActionDescription',
                  { defaultMessage: 'Delete this instance' }
                ),
                icon: 'trash' as const,
                type: 'icon' as const,
                color: 'danger' as const,
                onClick: (item: CloudOnboardingDeploymentListItem) =>
                  setOnboardingInstanceToDelete(item),
                'data-test-subj': 'deleteInstanceAction',
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <>
      {isAgentsTruncated ? (
        <>
          <EuiCallOut
            announceOnMount
            size="s"
            color="warning"
            iconType="warning"
            data-test-subj="instancesAgentsTruncated"
            title={i18n.translate(
              'xpack.fleet.epmInstalledIntegrations.instances.agentsTruncated',
              {
                defaultMessage:
                  'Not every agent could be loaded, so the status of some instances may be incomplete.',
              }
            )}
          />
          <EuiSpacer size="s" />
        </>
      ) : null}
      <EuiBasicTable
        items={onboardingInstances}
        loading={isLoading}
        itemId="id"
        columns={columns}
        tableCaption={i18n.translate(
          'xpack.fleet.epmInstalledIntegrations.instances.tableCaption',
          {
            defaultMessage: 'Instances',
          }
        )}
        rowProps={{ 'data-test-subj': 'instancesTableRow' }}
      />
      {flyoutAgent?.packagePolicy ? (
        <OnboardingInstanceAgentFlyout
          agent={flyoutAgent.agent}
          agentPolicyId={flyoutAgent.agentPolicyId}
          packagePolicy={flyoutAgent.packagePolicy}
          onClose={() => setFlyoutAgent(null)}
        />
      ) : null}
      {onboardingInstanceToDelete ? (
        <DeleteOnboardingInstanceModal
          onboardingInstanceName={getOnboardingInstanceName(onboardingInstanceToDelete)}
          onClose={() => setOnboardingInstanceToDelete(null)}
          onConfirm={() => deleteOnboardingInstance(onboardingInstanceToDelete)}
        />
      ) : null}
    </>
  );
};
