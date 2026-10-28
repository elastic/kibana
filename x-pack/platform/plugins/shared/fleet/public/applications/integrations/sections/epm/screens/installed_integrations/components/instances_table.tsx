/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { EuiBasicTable, EuiLink, EuiToolTip } from '@elastic/eui';
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
  useStartServices,
} from '../../../../../../../hooks';
import {
  ONBOARDING_APP_ID,
  ONBOARDING_AWS_PATH,
} from '../../../../../../../services/aws_onboarding_override';

import { DeleteInstanceModal } from './delete_instance_modal';

const EMPTY_CELL = '-';

const getInstanceName = (item: CloudOnboardingDeploymentListItem) =>
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

export const InstancesTable: React.FunctionComponent<{
  instances: CloudOnboardingDeploymentListItem[];
  /** The package being viewed, whose deployed version the Version column shows. */
  packageName: string;
}> = ({ instances, packageName }) => {
  const { application, notifications } = useStartServices();
  const authz = useAuthz();
  // Matches the authz of DELETE /api/fleet/cloud_onboarding_deployments/{id}.
  const canDelete = authz.fleet.allAgentPolicies || authz.integrations.all;
  const queryClient = useQueryClient();
  const [instanceToDelete, setInstanceToDelete] =
    useState<CloudOnboardingDeploymentListItem | null>(null);

  const deleteInstance = useCallback(
    async (instance: CloudOnboardingDeploymentListItem) => {
      try {
        await sendDeleteCloudOnboardingDeployment(instance.id);
        notifications.toasts.addSuccess(
          i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.deleteSuccess', {
            defaultMessage: 'Deleted instance {instanceName}',
            values: { instanceName: getInstanceName(instance) },
          })
        );
        setInstanceToDelete(null);
        await queryClient.invalidateQueries({ queryKey: ['cloud_onboarding_deployments'] });
      } catch (error) {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.deleteError', {
            defaultMessage: 'Could not delete instance {instanceName}',
            values: { instanceName: getInstanceName(instance) },
          }),
        });
      }
    },
    [notifications, queryClient]
  );

  // No `newSession` state: `deploymentId` makes the onboarding app hydrate from that session.
  const openInstance = useCallback(
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
        <EuiLink onClick={() => openInstance(item.id)} data-test-subj="instanceLink">
          {getInstanceName(item)}
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
    {
      field: 'agentCount',
      name: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.agentsColumn', {
        defaultMessage: 'Agents',
      }),
      render: (agentCount: number) => (agentCount > 0 ? agentCount : EMPTY_CELL),
    },
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
                onClick: (item: CloudOnboardingDeploymentListItem) => setInstanceToDelete(item),
                'data-test-subj': 'deleteInstanceAction',
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <>
      <EuiBasicTable
        items={instances}
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
      {instanceToDelete ? (
        <DeleteInstanceModal
          instanceName={getInstanceName(instanceToDelete)}
          onClose={() => setInstanceToDelete(null)}
          onConfirm={() => deleteInstance(instanceToDelete)}
        />
      ) : null}
    </>
  );
};
